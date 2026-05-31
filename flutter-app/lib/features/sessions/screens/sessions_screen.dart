import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/sessions_provider.dart';

/// Screen for viewing, scheduling, and managing skill exchange sessions.
/// Displays sessions for a specific match or all user sessions.
/// Supports scheduling new sessions, updating status, and adding/viewing notes.
class SessionsScreen extends ConsumerStatefulWidget {
  /// Optional matchId to filter sessions for a specific match.
  final String? matchId;

  const SessionsScreen({super.key, this.matchId});

  @override
  ConsumerState<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends ConsumerState<SessionsScreen> {
  @override
  Widget build(BuildContext context) {
    final sessionsAsync = ref.watch(sessionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sessions'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showScheduleDialog(context),
        child: const Icon(Icons.add),
      ),
      body: sessionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text('Failed to load sessions'),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.read(sessionsProvider.notifier).refresh(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (sessions) {
          final filtered = widget.matchId != null
              ? sessions
                  .where((s) => s.matchId == widget.matchId)
                  .toList()
              : sessions;

          if (filtered.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.calendar_today_outlined,
                      size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No sessions yet'),
                  SizedBox(height: 8),
                  Text(
                    'Schedule a session with your match partner!',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(sessionsProvider.notifier).refresh(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: filtered.length,
              itemBuilder: (context, index) {
                final session = filtered[index];
                return _SessionTile(session: session);
              },
            ),
          );
        },
      ),
    );
  }

  /// Shows a dialog to schedule a new session.
  void _showScheduleDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _ScheduleSessionSheet(matchId: widget.matchId),
    );
  }
}

/// Tile widget displaying a single session with status and actions.
class _SessionTile extends ConsumerWidget {
  final Session session;

  const _SessionTile({required this.session});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.person, size: 20, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    session.partnerUsername.isNotEmpty
                        ? session.partnerUsername
                        : 'Partner',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                _SessionStatusChip(status: session.status),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.schedule, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(
                  _formatDateTime(session.scheduledAt),
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.timer, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(
                  '${session.duration} minutes',
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (session.status == 'scheduled') ...[
                  TextButton.icon(
                    onPressed: () => _updateStatus(ref, context, 'completed'),
                    icon: const Icon(Icons.check_circle, size: 18),
                    label: const Text('Complete'),
                  ),
                  TextButton.icon(
                    onPressed: () => _updateStatus(ref, context, 'no_show'),
                    icon: const Icon(Icons.person_off, size: 18),
                    label: const Text('No-show'),
                  ),
                  TextButton.icon(
                    onPressed: () => _updateStatus(ref, context, 'cancelled'),
                    icon: const Icon(Icons.cancel, size: 18),
                    label: const Text('Cancel'),
                  ),
                ],
                IconButton(
                  onPressed: () => _showNotesDialog(context),
                  icon: const Icon(Icons.note_add),
                  tooltip: 'Notes',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateStatus(
      WidgetRef ref, BuildContext context, String status) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Mark as ${status.replaceAll('_', ' ')}?'),
        content: Text(
            'Are you sure you want to mark this session as ${status.replaceAll('_', ' ')}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await ref
          .read(sessionsProvider.notifier)
          .updateSessionStatus(session.id, status);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success
                ? 'Session marked as ${status.replaceAll('_', ' ')}'
                : 'Failed to update session'),
          ),
        );
      }
    }
  }

  void _showNotesDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _SessionNotesSheet(sessionId: session.id),
    );
  }

  String _formatDateTime(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year} at ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateStr;
    }
  }
}

/// Status chip for session status display.
class _SessionStatusChip extends StatelessWidget {
  final String status;

  const _SessionStatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color chipColor;
    IconData icon;
    switch (status.toLowerCase()) {
      case 'scheduled':
        chipColor = Colors.blue;
        icon = Icons.schedule;
        break;
      case 'completed':
        chipColor = Colors.green;
        icon = Icons.check_circle;
        break;
      case 'cancelled':
        chipColor = Colors.red;
        icon = Icons.cancel;
        break;
      case 'no_show':
        chipColor = Colors.orange;
        icon = Icons.person_off;
        break;
      default:
        chipColor = Colors.grey;
        icon = Icons.help_outline;
    }

    return Chip(
      avatar: Icon(icon, size: 14, color: chipColor),
      label: Text(
        status.replaceAll('_', ' ').toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          color: chipColor,
          fontWeight: FontWeight.bold,
        ),
      ),
      backgroundColor: chipColor.withValues(alpha: 0.1),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }
}

/// Bottom sheet for scheduling a new session.
class _ScheduleSessionSheet extends ConsumerStatefulWidget {
  final String? matchId;

  const _ScheduleSessionSheet({this.matchId});

  @override
  ConsumerState<_ScheduleSessionSheet> createState() =>
      _ScheduleSessionSheetState();
}

class _ScheduleSessionSheetState
    extends ConsumerState<_ScheduleSessionSheet> {
  final _matchIdController = TextEditingController();
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _selectedTime = const TimeOfDay(hour: 10, minute: 0);
  int _selectedDuration = 60;
  bool _isSubmitting = false;

  final List<int> _durationOptions = [30, 45, 60, 90, 120];

  @override
  void initState() {
    super.initState();
    if (widget.matchId != null) {
      _matchIdController.text = widget.matchId!;
    }
  }

  @override
  void dispose() {
    _matchIdController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Schedule Session',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          if (widget.matchId == null) ...[
            TextField(
              controller: _matchIdController,
              decoration: const InputDecoration(
                labelText: 'Match ID',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.link),
              ),
            ),
            const SizedBox(height: 16),
          ],
          // Date picker
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.calendar_today),
            title: const Text('Date'),
            subtitle: Text(
              '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
            ),
            onTap: _pickDate,
          ),
          // Time picker
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.access_time),
            title: const Text('Time'),
            subtitle: Text(_selectedTime.format(context)),
            onTap: _pickTime,
          ),
          // Duration selector
          const SizedBox(height: 8),
          Text('Duration', style: theme.textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: _durationOptions.map((duration) {
              final isSelected = _selectedDuration == duration;
              return ChoiceChip(
                label: Text('$duration min'),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) {
                    setState(() => _selectedDuration = duration);
                  }
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _scheduleSession,
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Schedule'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  Future<void> _scheduleSession() async {
    final matchId = _matchIdController.text.trim();
    if (matchId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a match ID')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final scheduledAt = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _selectedTime.hour,
      _selectedTime.minute,
    );

    final success = await ref.read(sessionsProvider.notifier).scheduleSession(
          matchId: matchId,
          scheduledAt: scheduledAt.toIso8601String(),
          duration: _selectedDuration,
        );

    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Session scheduled successfully')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to schedule session')),
        );
      }
    }
  }
}

/// Bottom sheet for viewing and adding session notes.
class _SessionNotesSheet extends ConsumerStatefulWidget {
  final String sessionId;

  const _SessionNotesSheet({required this.sessionId});

  @override
  ConsumerState<_SessionNotesSheet> createState() =>
      _SessionNotesSheetState();
}

class _SessionNotesSheetState extends ConsumerState<_SessionNotesSheet> {
  final _noteController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final notesAsync = ref.watch(sessionNotesProvider(widget.sessionId));

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Session Notes',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          // Notes list
          notesAsync.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (_, __) => const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Failed to load notes'),
            ),
            data: (notes) {
              if (notes.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(child: Text('No notes yet')),
                );
              }
              return ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 200),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: notes.length,
                  itemBuilder: (context, index) {
                    final note = notes[index];
                    return _NoteTile(note: note);
                  },
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          // Add note input
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _noteController,
                  decoration: const InputDecoration(
                    hintText: 'Add a note...',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                  minLines: 1,
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _isSubmitting ? null : _addNote,
                icon: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _addNote() async {
    final content = _noteController.text.trim();
    if (content.isEmpty) return;

    setState(() => _isSubmitting = true);

    final success = await ref
        .read(sessionNotesProvider(widget.sessionId).notifier)
        .addNote(widget.sessionId, content);

    setState(() => _isSubmitting = false);

    if (success) {
      _noteController.clear();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to add note')),
      );
    }
  }
}

/// Tile widget for displaying a single session note.
class _NoteTile extends StatelessWidget {
  final SessionNote note;

  const _NoteTile({required this.note});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: theme.colorScheme.secondaryContainer,
            child: Text(
              note.username.isNotEmpty ? note.username[0].toUpperCase() : '?',
              style: TextStyle(
                fontSize: 12,
                color: theme.colorScheme.onSecondaryContainer,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      note.username,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatDate(note.createdAt),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(note.content, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }
}
