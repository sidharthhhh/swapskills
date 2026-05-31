import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/constants.dart';
import 'secure_storage_service.dart';

/// Provider for the SocketService singleton.
final socketServiceProvider = Provider<SocketService>((ref) {
  return SocketService(ref);
});

/// Socket.IO client service for real-time chat communication.
///
/// Connects to the backend /chat namespace with JWT auth token.
/// Supports auto-reconnect on disconnect.
class SocketService {
  final Ref _ref;
  io.Socket? _socket;
  bool _isConnected = false;

  /// Callbacks for incoming events.
  void Function(Map<String, dynamic>)? onNewMessage;
  void Function(Map<String, dynamic>)? onTyping;
  void Function(Map<String, dynamic>)? onReadReceipt;
  void Function(Map<String, dynamic>)? onError;

  SocketService(this._ref);

  /// Whether the socket is currently connected.
  bool get isConnected => _isConnected;

  /// Connect to the Socket.IO /chat namespace with JWT auth.
  /// On web, socket connections are unreliable — skip connection.
  Future<void> connect() async {
    // Skip socket connection on web — use REST API fallback instead
    if (kIsWeb) return;

    if (_socket != null && _isConnected) return;

    final storage = _ref.read(secureStorageServiceProvider);
    final token = await storage.getAccessToken();

    if (token == null) return;

    _socket = io.io(
      '${AppConstants.apiBaseUrl}${AppConstants.socketChatNamespace}',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(5000)
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
    });

    _socket!.onConnectError((error) {
      _isConnected = false;
      onError?.call({'message': 'Connection error: $error'});
    });

    _socket!.on('new_message', (data) {
      if (data is Map<String, dynamic>) {
        onNewMessage?.call(data);
      } else if (data is Map) {
        onNewMessage?.call(Map<String, dynamic>.from(data));
      }
    });

    _socket!.on('typing', (data) {
      if (data is Map<String, dynamic>) {
        onTyping?.call(data);
      } else if (data is Map) {
        onTyping?.call(Map<String, dynamic>.from(data));
      }
    });

    _socket!.on('read_receipt', (data) {
      if (data is Map<String, dynamic>) {
        onReadReceipt?.call(data);
      } else if (data is Map) {
        onReadReceipt?.call(Map<String, dynamic>.from(data));
      }
    });

    _socket!.on('error', (data) {
      if (data is Map<String, dynamic>) {
        onError?.call(data);
      } else if (data is Map) {
        onError?.call(Map<String, dynamic>.from(data));
      } else {
        onError?.call({'message': data.toString()});
      }
    });

    _socket!.connect();
  }

  /// Disconnect from the Socket.IO server.
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }

  /// Join a specific chat room.
  void joinRoom(String roomId) {
    _socket?.emit('join_room', {'roomId': roomId});
  }

  /// Send a message to a chat room.
  void sendMessage(
    String roomId,
    String content,
    String contentType, [
    String? language,
    String? replyToId,
    String? fileUrl,
    String? fileName,
    int? fileSize,
  ]) {
    final data = <String, dynamic>{
      'roomId': roomId,
      'content': content,
      'contentType': contentType,
    };
    if (language != null) data['language'] = language;
    if (replyToId != null) data['replyToId'] = replyToId;
    if (fileUrl != null) data['fileUrl'] = fileUrl;
    if (fileName != null) data['fileName'] = fileName;
    if (fileSize != null) data['fileSize'] = fileSize;
    
    _socket?.emit('send_message', data);
  }

  /// Send a typing indicator to a chat room.
  void sendTyping(String roomId) {
    _socket?.emit('typing', {'roomId': roomId});
  }

  /// Send a read receipt for a chat room.
  void sendRead(String roomId) {
    _socket?.emit('read', {'roomId': roomId});
  }
}
