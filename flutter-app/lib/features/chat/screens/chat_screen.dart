import 'dart:async';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/chat_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../services/api_service.dart';
import '../../../services/socket_service.dart';
import 'package:swipe_to/swipe_to.dart';
import 'package:flutter_linkify/flutter_linkify.dart';
import 'package:url_launcher/url_launcher.dart';

/// Real-time chat screen for a specific room.
/// Features: message list with read states, typing indicator,
/// code snippet messages, text input with send button, auto-scroll,
/// message reactions, reply-to, and file/image messages.
class ChatScreen extends ConsumerStatefulWidget {
  final String roomId;
  final String? partnerUsername;

  const ChatScreen({
    super.key,
    required this.roomId,
    this.partnerUsername,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  Timer? _typingDebounce;
  bool _isCodeMode = false;
  String _codeLanguage = 'dart';

  // Reply state
  ChatMessage? _replyingTo;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    // Connect socket and join room
    _connectSocket();
    // Send read receipt when entering the room
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(chatMessagesProvider(widget.roomId).notifier).sendRead();
    });
  }

  Future<void> _connectSocket() async {
    final socketService = ref.read(socketServiceProvider);
    if (!socketService.isConnected) {
      await socketService.connect();
    }
  }

  void _onScroll() {
    // Load more messages when scrolling to the top
    if (_scrollController.position.pixels <=
        _scrollController.position.minScrollExtent + 50) {
      ref
          .read(chatMessagesProvider(widget.roomId).notifier)
          .fetchMessages(loadMore: true);
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _typingDebounce?.cancel();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  void _onTextChanged(String text) {
    _typingDebounce?.cancel();
    _typingDebounce = Timer(const Duration(milliseconds: 500), () {
      ref.read(chatMessagesProvider(widget.roomId).notifier).sendTyping();
    });
  }

  void _sendMessage() {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;

    final contentType = _isCodeMode ? 'code' : 'text';
    final language = _isCodeMode ? _codeLanguage : null;
    final replyToId = _replyingTo?.id;

    ref
        .read(chatMessagesProvider(widget.roomId).notifier)
        .sendMessage(content, contentType, language, replyToId);

    _messageController.clear();
    _cancelReply();
    _scrollToBottom();
  }

  void _toggleCodeMode() {
    setState(() {
      _isCodeMode = !_isCodeMode;
    });
  }

  void _startReply(ChatMessage message) {
    setState(() {
      _replyingTo = message;
    });
  }

  void _cancelReply() {
    setState(() {
      _replyingTo = null;
    });
  }

  void _showReactionPicker(ChatMessage message) {
    final emojis = ['👍', '❤️', '😂', '🎉', '💡', '🔥'];
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: emojis.map((emoji) {
                return GestureDetector(
                  onTap: () {
                    Navigator.pop(context);
                    ref
                        .read(chatMessagesProvider(widget.roomId).notifier)
                        .addReaction(message.id, emoji);
                  },
                  child: Text(emoji, style: const TextStyle(fontSize: 28)),
                );
              }).toList(),
            ),
          ),
        );
      },
    );
  }

  void _showMessageOptions(ChatMessage message) {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.reply),
                title: const Text('Reply'),
                onTap: () {
                  Navigator.pop(context);
                  _startReply(message);
                },
              ),
              ListTile(
                leading: const Icon(Icons.emoji_emotions_outlined),
                title: const Text('React'),
                onTap: () {
                  Navigator.pop(context);
                  _showReactionPicker(message);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _onAttachFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'zip', 'doc', 'docx'],
        withData: true,
      );

      if (result == null || result.files.isEmpty) return;

      final file = result.files.first;
      if (file.bytes == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not read file')),
          );
        }
        return;
      }

      // Show uploading indicator
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                SizedBox(width: 12),
                Text('Uploading...'),
              ],
            ),
            duration: Duration(seconds: 10),
          ),
        );
      }

      final api = ref.read(apiServiceProvider);
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(file.bytes!, filename: file.name),
      });

      final uploadResponse = await api.dio.post(
        '/api/v1/chat/upload',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );

      // Dismiss the uploading snackbar
      if (mounted) ScaffoldMessenger.of(context).hideCurrentSnackBar();

      if (uploadResponse.statusCode == 200 && uploadResponse.data['success'] == true) {
        final uploadData = uploadResponse.data['data'] as Map<String, dynamic>;
        final fileUrl = uploadData['fileUrl'] as String;
        final fileName = uploadData['fileName'] as String;
        final fileSize = uploadData['fileSize'] as int;
        final contentType = uploadData['contentType'] as String;

        ref.read(chatMessagesProvider(widget.roomId).notifier).sendMessage(
          contentType == 'image' ? '📷 Image' : '📎 $fileName',
          contentType,
          null,
          null,
          fileUrl,
          fileName,
          fileSize,
        );
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Upload failed. Try again.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to upload file')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final messagesState = ref.watch(chatMessagesProvider(widget.roomId));
    final typingUser = ref.watch(typingIndicatorProvider(widget.roomId));

    // Auto-scroll when new messages arrive
    ref.listen(chatMessagesProvider(widget.roomId), (prev, next) {
      if (prev != null &&
          next.messages.length > prev.messages.length &&
          !next.isLoading) {
        _scrollToBottom();
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.partnerUsername ?? 'Chat',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (typingUser != null)
              Text(
                'typing...',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontStyle: FontStyle.italic,
                    ),
              ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Messages list
          Expanded(
            child: _buildMessageList(context, messagesState),
          ),
          // Typing indicator
          if (typingUser != null) _buildTypingIndicator(context, typingUser),
          // Reply preview bar
          if (_replyingTo != null) _buildReplyPreview(context),
          // Code mode indicator
          if (_isCodeMode) _buildCodeModeBar(context),
          // Input area
          _buildInputArea(context),
        ],
      ),
    );
  }

  Widget _buildReplyPreview(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        border: Border(
          left: BorderSide(color: theme.colorScheme.primary, width: 3),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.reply, size: 16, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Replying to message',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  _replyingTo!.content.length > 60
                      ? '${_replyingTo!.content.substring(0, 60)}...'
                      : _replyingTo!.content,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            onPressed: _cancelReply,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageList(BuildContext context, ChatMessagesState state) {
    if (state.isLoading && state.messages.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(state.error!),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => ref
                  .read(chatMessagesProvider(widget.roomId).notifier)
                  .fetchMessages(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state.messages.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.chat_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('No messages yet'),
            SizedBox(height: 8),
            Text('Say hello to start the conversation!'),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: state.messages.length + (state.isLoading ? 1 : 0),
      itemBuilder: (context, index) {
        // Show loading indicator at the top when loading more
        if (state.isLoading && index == 0) {
          return const Padding(
            padding: EdgeInsets.all(8.0),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        }

        final msgIndex = state.isLoading ? index - 1 : index;
        final message = state.messages[msgIndex];
        return GestureDetector(
          onLongPress: () => _showMessageOptions(message),
          child: SwipeTo(
            onRightSwipe: (details) => _startReply(message),
            child: _MessageBubble(
              message: message,
              isMe: _isCurrentUser(message.senderId),
              roomId: widget.roomId,
              onReactionTap: (emoji) {
                // Toggle reaction: if user already reacted, remove; otherwise add
                ref
                    .read(chatMessagesProvider(widget.roomId).notifier)
                    .addReaction(message.id, emoji);
              },
            ),
          ),
        );
      },
    );
  }

  bool _isCurrentUser(String senderId) {
    final authState = ref.read(authProvider).valueOrNull;
    if (authState is AuthAuthenticated) {
      return authState.userId == senderId;
    }
    return false;
  }

  Widget _buildTypingIndicator(BuildContext context, String username) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      alignment: Alignment.centerLeft,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 24,
            height: 16,
            child: _TypingDots(),
          ),
          const SizedBox(width: 8),
          Text(
            '$username is typing...',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontStyle: FontStyle.italic,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildCodeModeBar(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      color: theme.colorScheme.surfaceContainerHighest,
      child: Row(
        children: [
          Icon(Icons.code, size: 16, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Text(
            'Code mode',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 8),
          DropdownButton<String>(
            value: _codeLanguage,
            isDense: true,
            underline: const SizedBox(),
            style: theme.textTheme.bodySmall,
            items: const [
              DropdownMenuItem(value: 'dart', child: Text('Dart')),
              DropdownMenuItem(value: 'javascript', child: Text('JavaScript')),
              DropdownMenuItem(value: 'python', child: Text('Python')),
              DropdownMenuItem(value: 'java', child: Text('Java')),
              DropdownMenuItem(value: 'kotlin', child: Text('Kotlin')),
              DropdownMenuItem(value: 'swift', child: Text('Swift')),
              DropdownMenuItem(value: 'typescript', child: Text('TypeScript')),
              DropdownMenuItem(value: 'rust', child: Text('Rust')),
              DropdownMenuItem(value: 'go', child: Text('Go')),
              DropdownMenuItem(value: 'other', child: Text('Other')),
            ],
            onChanged: (value) {
              if (value != null) {
                setState(() => _codeLanguage = value);
              }
            },
          ),
          const Spacer(),
          TextButton(
            onPressed: _toggleCodeMode,
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: EdgeInsets.only(
        left: 12,
        right: 12,
        top: 12,
        bottom: MediaQuery.of(context).padding.bottom + 12,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Code mode toggle
          IconButton(
            icon: Icon(
              Icons.code_rounded,
              color: _isCodeMode
                  ? theme.colorScheme.primary
                  : theme.colorScheme.onSurfaceVariant.withOpacity(0.7),
            ),
            onPressed: _toggleCodeMode,
            tooltip: 'Toggle code mode',
          ),
          // File attachment button
          IconButton(
            icon: Icon(
              Icons.attach_file_rounded,
              color: theme.colorScheme.onSurfaceVariant.withOpacity(0.7),
            ),
            onPressed: _onAttachFile,
            tooltip: 'Attach file',
          ),
          // Text input
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.6),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: theme.colorScheme.outlineVariant.withOpacity(0.5),
                  width: 1,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      onChanged: _onTextChanged,
                      maxLines: _isCodeMode ? 6 : 4,
                      minLines: 1,
                      textInputAction: _isCodeMode
                          ? TextInputAction.newline
                          : TextInputAction.send,
                      onSubmitted: _isCodeMode ? null : (_) => _sendMessage(),
                      decoration: InputDecoration(
                        hintText: _isCodeMode ? 'Paste code here...' : 'Message',
                        hintStyle: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant.withOpacity(0.6),
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      style: _isCodeMode
                          ? theme.textTheme.bodyMedium?.copyWith(
                              fontFamily: 'monospace',
                            )
                          : null,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 4),
          // Send button
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  theme.colorScheme.primary,
                  theme.colorScheme.secondary,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: theme.colorScheme.primary.withOpacity(0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: IconButton(
              icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              onPressed: _sendMessage,
              tooltip: 'Send message',
            ),
          ),
        ],
      ),
    );
  }
}


/// A single message bubble widget with support for replies, reactions, and file messages.
class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isMe;
  final String roomId;
  final void Function(String emoji) onReactionTap;

  const _MessageBubble({
    required this.message,
    required this.isMe,
    required this.roomId,
    required this.onReactionTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    // Create gradient for sent messages
    final messageGradient = isMe
        ? LinearGradient(
            colors: [
              colorScheme.primary,
              colorScheme.secondary,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          )
        : null;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        margin: const EdgeInsets.symmetric(vertical: 6),
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            // Message bubble
            Container(
              padding: message.contentType == 'code'
                  ? const EdgeInsets.all(4)
                  : const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                gradient: messageGradient,
                color: isMe ? null : theme.colorScheme.surfaceContainerHighest.withOpacity(0.7),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(20),
                  topRight: const Radius.circular(20),
                  bottomLeft: isMe ? const Radius.circular(20) : const Radius.circular(4),
                  bottomRight: isMe ? const Radius.circular(4) : const Radius.circular(20),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Reply quote
                  if (message.replyToId != null && message.replyContent != null)
                    _buildReplyQuote(context),
                  // Message content
                  if (message.contentType == 'image')
                    _buildImageContent(context)
                  else if (message.contentType == 'file')
                    _buildFileContent(context)
                  else if (message.contentType == 'code')
                    _buildCodeContent(context)
                  else
                    _buildTextContent(context),
                  const SizedBox(height: 4),
                  // Timestamp and read status
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _formatMessageTime(message.createdAt),
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: isMe
                              ? theme.colorScheme.onPrimary
                                  .withOpacity(0.8)
                              : theme.colorScheme.onSurfaceVariant.withOpacity(0.8),
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (isMe) ...[
                        const SizedBox(width: 4),
                        Icon(
                          message.isRead ? Icons.done_all_rounded : Icons.done_rounded,
                          size: 14,
                          color: message.isRead
                              ? Colors.white
                              : theme.colorScheme.onPrimary.withOpacity(0.6),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            // Reactions row
            if (message.reactions.isNotEmpty) _buildReactionsRow(context),
          ],
        ),
      ),
    );
  }

  Widget _buildReplyQuote(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(
            color: isMe
                ? theme.colorScheme.onPrimary.withValues(alpha: 0.5)
                : theme.colorScheme.primary,
            width: 2,
          ),
        ),
        color: isMe
            ? theme.colorScheme.onPrimary.withValues(alpha: 0.1)
            : theme.colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: const BorderRadius.only(
          topRight: Radius.circular(4),
          bottomRight: Radius.circular(4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (message.replyUsername != null)
            Text(
              message.replyUsername!,
              style: theme.textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: isMe
                    ? theme.colorScheme.onPrimary.withValues(alpha: 0.8)
                    : theme.colorScheme.primary,
              ),
            ),
          Text(
            (message.replyContent ?? '').length > 50
                ? '${message.replyContent!.substring(0, 50)}...'
                : message.replyContent ?? '',
            style: theme.textTheme.bodySmall?.copyWith(
              color: isMe
                  ? theme.colorScheme.onPrimary.withValues(alpha: 0.7)
                  : theme.colorScheme.onSurfaceVariant,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildReactionsRow(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 2),
      child: Wrap(
        spacing: 4,
        children: message.reactions.map((reaction) {
          return GestureDetector(
            onTap: () => onReactionTap(reaction.emoji),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: theme.colorScheme.outline.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(reaction.emoji, style: const TextStyle(fontSize: 14)),
                  if (reaction.count > 1) ...[
                    const SizedBox(width: 2),
                    Text(
                      '${reaction.count}',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildImageContent(BuildContext context) {
    final theme = Theme.of(context);
    if (message.fileUrl != null && message.fileUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.network(
          message.fileUrl!,
          width: 200,
          height: 200,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return Container(
              width: 200,
              height: 100,
              color: theme.colorScheme.surfaceContainerHighest,
              child: const Center(child: Icon(Icons.broken_image, size: 32)),
            );
          },
        ),
      );
    }
    return _buildTextContent(context);
  }

  Widget _buildFileContent(BuildContext context) {
    final theme = Theme.of(context);
    final fileName = message.fileName ?? 'File';
    final fileSize = message.fileSize != null
        ? _formatFileSize(message.fileSize!)
        : 'Unknown size';

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: theme.brightness == Brightness.dark
            ? Colors.grey.shade800
            : Colors.grey.shade200,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.insert_drive_file,
            color: theme.colorScheme.primary,
            size: 32,
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fileName,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                    color: theme.colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  fileSize,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextContent(BuildContext context) {
    final theme = Theme.of(context);
    return Linkify(
      onOpen: (link) async {
        final uri = Uri.parse(link.url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri);
        }
      },
      text: message.content,
      style: theme.textTheme.bodyMedium?.copyWith(
        color: isMe
            ? theme.colorScheme.onPrimary
            : theme.colorScheme.onSurface,
      ),
      linkStyle: theme.textTheme.bodyMedium?.copyWith(
        color: isMe ? Colors.white : theme.colorScheme.primary,
        decoration: TextDecoration.underline,
      ),
      options: const LinkifyOptions(humanize: false),
    );
  }

  Widget _buildCodeContent(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: theme.brightness == Brightness.dark
            ? Colors.grey.shade900
            : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (message.language != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                message.language!,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          SelectableText(
            message.content,
            style: theme.textTheme.bodySmall?.copyWith(
              fontFamily: 'monospace',
              color: theme.colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  String _formatMessageTime(DateTime dateTime) {
    final hour = dateTime.hour.toString().padLeft(2, '0');
    final minute = dateTime.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

/// Animated typing dots indicator.
class _TypingDots extends StatefulWidget {
  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots>
    with TickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final delay = index * 0.2;
            final value = (_controller.value - delay).clamp(0.0, 1.0);
            final opacity = (value < 0.5) ? value * 2 : (1.0 - value) * 2;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1),
              child: Opacity(
                opacity: opacity.clamp(0.3, 1.0),
                child: Container(
                  width: 5,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
