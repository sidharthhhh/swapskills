import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';

/// A skill from the catalog.
class Skill {
  final String id;
  final String name;
  final String category;

  const Skill({
    required this.id,
    required this.name,
    required this.category,
  });

  factory Skill.fromJson(Map<String, dynamic> json) {
    return Skill(
      id: json['id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      category: json['category'] as String? ?? 'Other',
    );
  }
}

/// A category containing a list of skills.
class SkillCategory {
  final String category;
  final List<Skill> skills;

  const SkillCategory({
    required this.category,
    required this.skills,
  });

  factory SkillCategory.fromJson(Map<String, dynamic> json) {
    return SkillCategory(
      category: json['category'] as String? ?? 'Other',
      skills: (json['skills'] as List<dynamic>?)
              ?.map((s) => Skill.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// Provider for the full list of skills.
final allSkillsProvider = FutureProvider<List<Skill>>((ref) async {
  try {
    final api = ref.read(apiServiceProvider);
    final response = await api.dio.get('/api/v1/skills');

    if (response.statusCode == 200 && response.data['success'] == true) {
      final data = response.data['data'] as List<dynamic>;
      return data
          .map((s) => Skill.fromJson(s as Map<String, dynamic>))
          .toList();
    }
  } on DioException catch (_) {
    // Failed to fetch skills.
  }
  return [];
});

/// Provider for skills grouped by category.
final skillCategoriesProvider = FutureProvider<List<SkillCategory>>((ref) async {
  try {
    final api = ref.read(apiServiceProvider);
    final response = await api.dio.get('/api/v1/skills/categories');

    if (response.statusCode == 200 && response.data['success'] == true) {
      final data = response.data['data'] as List<dynamic>;
      return data
          .map((c) => SkillCategory.fromJson(c as Map<String, dynamic>))
          .toList();
    }
  } on DioException catch (_) {
    // Failed to fetch categories.
  }
  return [];
});

/// Notifier for managing user skill operations (add/remove teach/learn).
final skillsManagementProvider =
    NotifierProvider<SkillsManagementNotifier, void>(
        SkillsManagementNotifier.new);

class SkillsManagementNotifier extends Notifier<void> {
  @override
  void build() {}

  /// Add a skill to the user's teach list.
  Future<bool> addTeachSkill(String skillId) async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.post(
        '/api/v1/users/me/skills/teach',
        data: {'skillId': skillId},
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } on DioException catch (_) {
      return false;
    }
  }

  /// Add a skill to the user's learn list.
  Future<bool> addLearnSkill(String skillId) async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.post(
        '/api/v1/users/me/skills/learn',
        data: {'skillId': skillId},
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } on DioException catch (_) {
      return false;
    }
  }

  /// Remove a skill from the user's teach list.
  Future<bool> removeTeachSkill(String skillId) async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.delete(
        '/api/v1/users/me/skills/teach/$skillId',
      );
      return response.statusCode == 200;
    } on DioException catch (_) {
      return false;
    }
  }

  /// Remove a skill from the user's learn list.
  Future<bool> removeLearnSkill(String skillId) async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.delete(
        '/api/v1/users/me/skills/learn/$skillId',
      );
      return response.statusCode == 200;
    } on DioException catch (_) {
      return false;
    }
  }
}
