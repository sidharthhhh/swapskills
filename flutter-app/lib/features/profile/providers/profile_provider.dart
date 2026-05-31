import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';

/// User profile data model.
class UserProfile {
  final String uid;
  final String username;
  final String? bio;
  final String experienceLevel;
  final String availability;
  final double trustScore;
  final String status;
  final List<UserSkill> teachSkills;
  final List<UserSkill> learnSkills;

  const UserProfile({
    required this.uid,
    required this.username,
    this.bio,
    required this.experienceLevel,
    required this.availability,
    required this.trustScore,
    required this.status,
    this.teachSkills = const [],
    this.learnSkills = const [],
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      uid: json['uid']?.toString() ?? '',
      username: json['username'] as String? ?? '',
      bio: json['bio'] as String?,
      experienceLevel: json['experience_level'] as String? ?? json['experienceLevel'] as String? ?? 'beginner',
      availability: json['availability'] as String? ?? 'weekends',
      trustScore: double.tryParse(json['trust_score']?.toString() ?? json['trustScore']?.toString() ?? '50') ?? 50.0,
      status: json['status'] as String? ?? 'active',
      teachSkills: (json['teachSkills'] as List<dynamic>? ?? json['teach_skills'] as List<dynamic>? ?? [])
              .map((s) => UserSkill.fromJson(s as Map<String, dynamic>))
              .toList(),
      learnSkills: (json['learnSkills'] as List<dynamic>? ?? json['learn_skills'] as List<dynamic>? ?? [])
              .map((s) => UserSkill.fromJson(s as Map<String, dynamic>))
              .toList(),
    );
  }

  UserProfile copyWith({
    String? bio,
    String? experienceLevel,
    String? availability,
    List<UserSkill>? teachSkills,
    List<UserSkill>? learnSkills,
  }) {
    return UserProfile(
      uid: uid,
      username: username,
      bio: bio ?? this.bio,
      experienceLevel: experienceLevel ?? this.experienceLevel,
      availability: availability ?? this.availability,
      trustScore: trustScore,
      status: status,
      teachSkills: teachSkills ?? this.teachSkills,
      learnSkills: learnSkills ?? this.learnSkills,
    );
  }
}

/// A skill associated with a user.
class UserSkill {
  final String id;
  final String name;
  final String? category;

  const UserSkill({
    required this.id,
    required this.name,
    this.category,
  });

  factory UserSkill.fromJson(Map<String, dynamic> json) {
    return UserSkill(
      id: json['id']?.toString() ?? json['skill_id']?.toString() ?? '',
      name: json['name'] as String? ?? json['skill_name'] as String? ?? '',
      category: json['category'] as String?,
    );
  }
}

/// Riverpod AsyncNotifier for managing user profile state.
final profileProvider =
    AsyncNotifierProvider<ProfileNotifier, UserProfile?>(ProfileNotifier.new);

class ProfileNotifier extends AsyncNotifier<UserProfile?> {
  @override
  Future<UserProfile?> build() async {
    return await fetchProfile();
  }

  /// Fetch the current user's profile from the backend.
  Future<UserProfile?> fetchProfile() async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.get('/api/v1/users/me');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return UserProfile.fromJson(response.data['data'] as Map<String, dynamic>);
      }
    } on DioException catch (_) {
      // Network or server error — return null.
    }
    return null;
  }

  /// Update the user's profile fields.
  Future<bool> updateProfile({
    String? bio,
    String? availability,
    String? experienceLevel,
  }) async {
    try {
      final api = ref.read(apiServiceProvider);
      final body = <String, dynamic>{};
      if (bio != null) body['bio'] = bio;
      if (availability != null) body['availability'] = availability;
      if (experienceLevel != null) body['experience_level'] = experienceLevel;

      final response = await api.dio.put('/api/v1/users/me', data: body);

      if (response.statusCode == 200 && response.data['success'] == true) {
        // Refresh profile data after update.
        final updated = await fetchProfile();
        state = AsyncValue.data(updated);
        return true;
      }
    } on DioException catch (_) {
      // Update failed.
    }
    return false;
  }

  /// Add a skill to the user's teach list.
  Future<bool> addTeachSkill(String skillId) async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.post(
        '/api/v1/users/me/skills/teach',
        data: {'skillId': int.tryParse(skillId) ?? skillId},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final updated = await fetchProfile();
        state = AsyncValue.data(updated);
        return true;
      }
    } on DioException catch (_) {
      // Failed to add skill.
    }
    return false;
  }

  /// Add a skill to the user's learn list.
  Future<bool> addLearnSkill(String skillId) async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.post(
        '/api/v1/users/me/skills/learn',
        data: {'skillId': int.tryParse(skillId) ?? skillId},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final updated = await fetchProfile();
        state = AsyncValue.data(updated);
        return true;
      }
    } on DioException catch (_) {
      // Failed to add skill.
    }
    return false;
  }

  /// Remove a skill from the user's teach list.
  Future<bool> removeTeachSkill(String skillId) async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.delete(
        '/api/v1/users/me/skills/teach/$skillId',
      );

      if (response.statusCode == 200) {
        final updated = await fetchProfile();
        state = AsyncValue.data(updated);
        return true;
      }
    } on DioException catch (_) {
      // Failed to remove skill.
    }
    return false;
  }

  /// Remove a skill from the user's learn list.
  Future<bool> removeLearnSkill(String skillId) async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.delete(
        '/api/v1/users/me/skills/learn/$skillId',
      );

      if (response.statusCode == 200) {
        final updated = await fetchProfile();
        state = AsyncValue.data(updated);
        return true;
      }
    } on DioException catch (_) {
      // Failed to remove skill.
    }
    return false;
  }
}
