import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';
import '../../../services/socket_service.dart';
import '../../../core/constants.dart';

// --- Models ---

/// Represents a chat room with its last message and unread count.
class ChatRoom {
  final String id;
  final String matchId;
  final String partnerUsername;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCount;

  const ChatRoom({
    required this.id,
    required this.matchId,
    required this.partnerUsername,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
  });

  factory ChatRoom.fromJson(Map<String, dynamic> json) {
    return ChatRoom(
      id: json['id']?.toString() ?? '',
      matchId: json['matchId']?.toString() ?? json['match_id']?.toString() ?? '',
      partnerUsername: json['partnerUsername'] as String? ??
          json['partner_username'] as String? ??
          'Unknown',
      lastMessage: json['lastMessage'] as String? ?? json['last_message'] as String?,
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.tryParse(json['lastMessageAt'] as String)
          : json['last_message_at'] != null
              ? DateTime.tryParse(json['last_message_at'] as String)
              : null,
      unreadCount: json['unreadCount'] as int? ?? json['unread_count'] as int? ?? 0,
    );
  }
}

/// Represents a reaction on a message.
class MessageReaction {
  final String emoji;
  final int count;
  final List<String> users;

  const MessageReaction({
    required this.emoji,
    required this.count,
    required this.users,
  });

  factory MessageReaction.fromJson(Map<String, dynamic> json) {
    return MessageReaction(
      emoji: json['emoji'] as String? ?? '',
      count: json['count'] as int? ?? 0,
      users: json['users'] is String
          ? (json['users'] as String).split(',')
          : (json['users'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

/// Represents a single chat message.
class ChatMessage {
  final String id;
  final String senderId;
  final String content;
  final String contentType;
  final String? language;
  final bool isRead;
  final DateTime createdAt;
  final String? replyToId;
  final String? replyContent;
  final String? replyUsername;
  final String? fileUrl;
  final String? fileName;
  final int? fileSize;
  final List<MessageReaction> reactions;

  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.content,
    this.contentType = 'text',
    this.language,
    this.isRead = false,
    required this.createdAt,
    this.replyToId,
    this.replyContent,
    this.replyUsername,
    this.fileUrl,
    this.fileName,
    this.fileSize,
    this.reactions = const [],
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final reactionsJson = json['reactions'] as List<dynamic>? ?? [];
    return ChatMessage(
      id: json['id']?.toString() ?? '',
      senderId: json['senderId']?.toString() ?? json['sender_id']?.toString() ?? '',
      content: json['content'] as String? ?? '',
      contentType: json['contentType'] as String? ?? json['content_type'] as String? ?? 'text',
      language: json['language'] as String?,
      isRead: json['readAt'] != null || json['read_at'] != null || json['isRead'] == true,
      createdAt: DateTime.tryParse(
            json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
          ) ??
          DateTime.now(),
      replyToId: json['replyToId']?.toString() ?? json['reply_to_id']?.toString(),
      replyContent: json['replyContent'] as String? ?? json['reply_content'] as String?,
      replyUsername: json['replyUsername'] as String? ?? json['reply_username'] as String?,
      fileUrl: json['fileUrl'] as String? ?? json['file_url'] as String?,
      fileName: json['fileName'] as String? ?? json['file_name'] as String?,
      fileSize: json['fileSize'] as int? ?? json['file_size'] as int?,
      reactions: reactionsJson
          .map((r) => MessageReaction.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Create a copy with updated reactions.
  ChatMessage copyWithReactions(List<MessageReaction> newReactions) {
    return ChatMessage(
      id: id,
      senderId: senderId,
      content: content,
      contentType: contentType,
      language: language,
      isRead: isRead,
      createdAt: createdAt,
      replyToId: replyToId,
      replyContent: replyContent,
      replyUsername: replyUsername,
      fileUrl: fileUrl,
      fileName: fileName,
      fileSize: fileSize,
      reactions: newReactions,
    );
  }
}

// --- State classes ---

/// State for the chat rooms list.
class ChatRoomsState {
  final List<ChatRoom> rooms;
  final bool isLoading;
  final String? error;

  const ChatRoomsState({
    this.rooms = const [],
    this.isLoading = false,
    this.error,
  });

  ChatRoomsState copyWith({
    List<ChatRoom>? rooms,
    bool? isLoading,
    String? error,
  }) {
    return ChatRoomsState(
      rooms: rooms ?? this.rooms,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// State for messages in a specific room.
class ChatMessagesState {
  final List<ChatMessage> messages;
  final bool isLoading;
  final bool hasMore;
  final int page;
  final String? error;

  const ChatMessagesState({
    this.messages = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.page = 1,
    this.error,
  });

  ChatMessagesState copyWith({
    List<ChatMessage>? messages,
    bool? isLoading,
    bool? hasMore,
    int? page,
    String? error,
  }) {
    return ChatMessagesState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      hasMore: hasMore ?? this.hasMore,
      page: page ?? this.page,
      error: error,
    );
  }
}

// --- Providers ---

/// Provider for the list of chat rooms.
final chatRoomsProvider =
    StateNotifierProvider<ChatRoomsNotifier, ChatRoomsState>((ref) {
  return ChatRoomsNotifier(ref);
});

/// Provider for messages in a specific room, keyed by roomId.
final chatMessagesProvider = StateNotifierProvider.family<
    ChatMessagesNotifier, ChatMessagesState, String>((ref, roomId) {
  return ChatMessagesNotifier(ref, roomId);
});

/// Provider for typing indicator state, keyed by roomId.
/// Stores the username of the user currently typing, or null.
final typingIndicatorProvider =
    StateProvider.family<String?, String>((ref, roomId) => null);

// --- Notifiers ---

/// Manages the list of chat rooms.
class ChatRoomsNotifier extends StateNotifier<ChatRoomsState> {
  final Ref _ref;

  ChatRoomsNotifier(this._ref) : super(const ChatRoomsState()) {
    fetchRooms();
  }

  /// Fetch chat rooms from the backend.
  Future<void> fetchRooms() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final api = _ref.read(apiServiceProvider);
      final response = await api.dio.get('/api/v1/chat/rooms');

      if (response.statusCode == 200) {
        final data = response.data;
        final List<dynamic> roomsJson =
            data is Map ? (data['data'] as List? ?? []) : (data as List? ?? []);
        final rooms = roomsJson
            .map((json) => ChatRoom.fromJson(json as Map<String, dynamic>))
            .toList();
        state = state.copyWith(rooms: rooms, isLoading: false);
      } else {
        state = state.copyWith(isLoading: false, error: 'Failed to load rooms');
      }
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.response?.data?['message'] as String? ?? 'Failed to load rooms',
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'An error occurred');
    }
  }

  /// Update a room's last message when a new message arrives via socket.
  void updateRoomLastMessage(String roomId, String message, DateTime timestamp) {
    final updatedRooms = state.rooms.map((room) {
      if (room.id == roomId) {
        return ChatRoom(
          id: room.id,
          matchId: room.matchId,
          partnerUsername: room.partnerUsername,
          lastMessage: message,
          lastMessageAt: timestamp,
          unreadCount: room.unreadCount + 1,
        );
      }
      return room;
    }).toList();
    state = state.copyWith(rooms: updatedRooms);
  }

  /// Clear unread count for a specific room.
  void clearUnread(String roomId) {
    final updatedRooms = state.rooms.map((room) {
      if (room.id == roomId) {
        return ChatRoom(
          id: room.id,
          matchId: room.matchId,
          partnerUsername: room.partnerUsername,
          lastMessage: room.lastMessage,
          lastMessageAt: room.lastMessageAt,
          unreadCount: 0,
        );
      }
      return room;
    }).toList();
    state = state.copyWith(rooms: updatedRooms);
  }
}

/// Manages messages for a specific chat room.
class ChatMessagesNotifier extends StateNotifier<ChatMessagesState> {
  final Ref _ref;
  final String roomId;

  ChatMessagesNotifier(this._ref, this.roomId)
      : super(const ChatMessagesState()) {
    _initSocket();
    fetchMessages();
  }

  /// Set up socket listeners for real-time messages.
  void _initSocket() {
    final socketService = _ref.read(socketServiceProvider);

    socketService.onNewMessage = (data) {
      final messageRoomId = data['roomId']?.toString() ??
          data['room_id']?.toString() ??
          data['chatRoomId']?.toString() ??
          data['chat_room_id']?.toString() ??
          '';
      if (messageRoomId == roomId || data['chat_room_id']?.toString() == roomId) {
        final message = ChatMessage.fromJson(data);
        state = state.copyWith(
          messages: [...state.messages, message],
        );
      }
      // Also update the rooms list
      _ref.read(chatRoomsProvider.notifier).updateRoomLastMessage(
            messageRoomId.isNotEmpty ? messageRoomId : roomId,
            data['content'] as String? ?? '',
            DateTime.now(),
          );
    };

    socketService.onTyping = (data) {
      final typingRoomId = data['roomId']?.toString() ?? data['room_id']?.toString() ?? '';
      if (typingRoomId == roomId) {
        final userId = data['userId']?.toString() ?? data['user_id']?.toString() ?? '';
        _ref.read(typingIndicatorProvider(roomId).notifier).state = userId;
        // Clear typing indicator after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            _ref.read(typingIndicatorProvider(roomId).notifier).state = null;
          }
        });
      }
    };

    socketService.onReadReceipt = (data) {
      final readRoomId = data['roomId']?.toString() ?? data['room_id']?.toString() ?? '';
      if (readRoomId == roomId) {
        // Mark messages as read
        final updatedMessages = state.messages.map((msg) {
          return ChatMessage(
            id: msg.id,
            senderId: msg.senderId,
            content: msg.content,
            contentType: msg.contentType,
            language: msg.language,
            isRead: true,
            createdAt: msg.createdAt,
            replyToId: msg.replyToId,
            replyContent: msg.replyContent,
            replyUsername: msg.replyUsername,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            fileSize: msg.fileSize,
            reactions: msg.reactions,
          );
        }).toList();
        state = state.copyWith(messages: updatedMessages);
      }
    };

    // Join the room
    socketService.joinRoom(roomId);
  }

  /// Fetch message history from the backend with pagination.
  Future<void> fetchMessages({bool loadMore = false}) async {
    if (state.isLoading) return;
    if (loadMore && !state.hasMore) return;

    final page = loadMore ? state.page + 1 : 1;
    state = state.copyWith(isLoading: true, error: null);

    try {
      final api = _ref.read(apiServiceProvider);
      final response = await api.dio.get(
        '/api/v1/chat/rooms/$roomId/messages',
        queryParameters: {
          'page': page,
          'limit': AppConstants.defaultPageSize,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        // API returns { success, data: { messages: [...], pagination: {...} } }
        final responseData = data is Map ? data['data'] : data;
        final List<dynamic> messagesJson;
        if (responseData is Map && responseData.containsKey('messages')) {
          messagesJson = responseData['messages'] as List<dynamic>? ?? [];
        } else if (responseData is List) {
          messagesJson = responseData;
        } else {
          messagesJson = [];
        }
        final newMessages = messagesJson
            .map((json) => ChatMessage.fromJson(json as Map<String, dynamic>))
            .toList();

        // Messages from API come newest-first; reverse for display (oldest first).
        final reversed = newMessages.reversed.toList();

        final allMessages = loadMore
            ? [...reversed, ...state.messages]
            : reversed;

        state = state.copyWith(
          messages: allMessages,
          isLoading: false,
          hasMore: newMessages.length >= AppConstants.defaultPageSize,
          page: page,
        );
      } else {
        state = state.copyWith(isLoading: false, error: 'Failed to load messages');
      }
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.response?.data?['message'] as String? ?? 'Failed to load messages',
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'An error occurred');
    }
  }

  /// Send a message via REST API and add to local state.
  Future<void> sendMessage(
    String content,
    String contentType, [
    String? language,
    String? replyToId,
    String? fileUrl,
    String? fileName,
    int? fileSize,
  ]) async {
    try {
      final api = _ref.read(apiServiceProvider);
      // Use REST API to send message (Socket.IO doesn't work reliably on web)
      final response = await api.dio.post(
        '/api/v1/chat/rooms/$roomId/messages',
        data: {
          'content': content,
          'contentType': contentType,
          if (language != null) 'language': language,
          if (replyToId != null) 'replyToId': replyToId,
          if (fileUrl != null) 'fileUrl': fileUrl,
          if (fileName != null) 'fileName': fileName,
          if (fileSize != null) 'fileSize': fileSize,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Refresh messages to show the new one
        await fetchMessages();
      }
    } catch (_) {
      // Fallback: try socket
      final socketService = _ref.read(socketServiceProvider);
      socketService.sendMessage(roomId, content, contentType, language);
    }
  }

  /// Add a reaction to a message.
  Future<void> addReaction(String messageId, String emoji) async {
    try {
      final api = _ref.read(apiServiceProvider);
      await api.dio.post(
        '/api/v1/chat/rooms/$roomId/messages/$messageId/reactions',
        data: {'emoji': emoji},
      );
      // Refresh messages to show updated reactions
      await fetchMessages();
    } catch (_) {
      // Silently fail
    }
  }

  /// Remove a reaction from a message.
  Future<void> removeReaction(String messageId, String emoji) async {
    try {
      final api = _ref.read(apiServiceProvider);
      await api.dio.delete(
        '/api/v1/chat/rooms/$roomId/messages/$messageId/reactions/${Uri.encodeComponent(emoji)}',
      );
      // Refresh messages to show updated reactions
      await fetchMessages();
    } catch (_) {
      // Silently fail
    }
  }

  /// Send typing indicator.
  void sendTyping() {
    final socketService = _ref.read(socketServiceProvider);
    socketService.sendTyping(roomId);
  }

  /// Send read receipt.
  void sendRead() {
    final socketService = _ref.read(socketServiceProvider);
    socketService.sendRead(roomId);
    _ref.read(chatRoomsProvider.notifier).clearUnread(roomId);
  }

  @override
  void dispose() {
    // Clear socket callbacks when this notifier is disposed.
    final socketService = _ref.read(socketServiceProvider);
    socketService.onNewMessage = null;
    socketService.onTyping = null;
    socketService.onReadReceipt = null;
    super.dispose();
  }
}
