import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../src/config/prisma';

async function main() {
  console.log('Seeding database with dummy data...');

  // 1. Create Skills
  const skillsData = [
    { name: 'JavaScript', category: 'Programming' },
    { name: 'Python', category: 'Programming' },
    { name: 'React', category: 'Frontend' },
    { name: 'Flutter', category: 'Mobile' },
    { name: 'UI/UX Design', category: 'Design' },
    { name: 'Spanish', category: 'Languages' },
    { name: 'Digital Marketing', category: 'Marketing' },
    { name: 'Piano', category: 'Music' },
  ];

  const createdSkills = [];
  for (const skill of skillsData) {
    const created = await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    });
    createdSkills.push(created);
  }
  console.log(`Created ${createdSkills.length} skills.`);

  // 2. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const usersData = [
    {
      uid: 'user_' + crypto.randomBytes(4).toString('hex'),
      username: 'alice_coder',
      email: 'alice@example.com',
      password_hash: passwordHash,
      bio: 'I love coding and learning new languages!',
      experience_level: 'expert',
      availability: 'flexible',
      trust_score: 98.5,
      teach: ['JavaScript', 'React'],
      learn: ['Python', 'UI/UX Design'],
    },
    {
      uid: 'user_' + crypto.randomBytes(4).toString('hex'),
      username: 'bob_designer',
      email: 'bob@example.com',
      password_hash: passwordHash,
      bio: 'Visual designer looking to learn frontend development.',
      experience_level: 'intermediate',
      availability: 'weekends',
      trust_score: 95.0,
      teach: ['UI/UX Design'],
      learn: ['React', 'JavaScript'],
    },
    {
      uid: 'user_' + crypto.randomBytes(4).toString('hex'),
      username: 'charlie_polyglot',
      email: 'charlie@example.com',
      password_hash: passwordHash,
      bio: 'Native Spanish speaker, learning to code in Python.',
      experience_level: 'beginner',
      availability: 'evenings',
      trust_score: 100.0,
      teach: ['Spanish'],
      learn: ['Python'],
    },
    {
      uid: 'user_' + crypto.randomBytes(4).toString('hex'),
      username: 'diana_dev',
      email: 'diana@example.com',
      password_hash: passwordHash,
      bio: 'Python developer interested in mobile app dev.',
      experience_level: 'expert',
      availability: 'flexible',
      trust_score: 99.0,
      teach: ['Python'],
      learn: ['Flutter'],
    }
  ];

  const createdUsers = [];
  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        uid: userData.uid,
        username: userData.username,
        email: userData.email,
        password_hash: userData.password_hash,
        bio: userData.bio,
        experience_level: userData.experience_level,
        availability: userData.availability,
        trust_score: userData.trust_score,
      },
    });
    createdUsers.push({ ...user, teach: userData.teach, learn: userData.learn });
    
    // Assign skills
    for (const skillName of userData.teach) {
      const skill = createdSkills.find(s => s.name === skillName);
      if (skill) {
        await prisma.userTeachSkill.upsert({
          where: { user_id_skill_id: { user_id: user.id, skill_id: skill.id } },
          update: {},
          create: { user_id: user.id, skill_id: skill.id },
        });
      }
    }

    for (const skillName of userData.learn) {
      const skill = createdSkills.find(s => s.name === skillName);
      if (skill) {
        await prisma.userLearnSkill.upsert({
          where: { user_id_skill_id: { user_id: user.id, skill_id: skill.id } },
          update: {},
          create: { user_id: user.id, skill_id: skill.id },
        });
      }
    }
  }
  console.log(`Created ${createdUsers.length} users with their skills.`);

  // 3. Create a Match between Alice and Bob
  const alice = createdUsers.find(u => u.username === 'alice_coder');
  const bob = createdUsers.find(u => u.username === 'bob_designer');
  
  if (alice && bob) {
    const reactSkill = createdSkills.find(s => s.name === 'React');
    const designSkill = createdSkills.find(s => s.name === 'UI/UX Design');
    
    if (reactSkill && designSkill) {
      // Create match request
      const request = await prisma.matchRequest.create({
        data: {
          sender_id: alice.id,
          receiver_id: bob.id,
          teach_skill_id: reactSkill.id,
          learn_skill_id: designSkill.id,
          status: 'accepted',
        }
      });
      
      // Create match
      const match = await prisma.match.create({
        data: {
          user_a_id: alice.id,
          user_b_id: bob.id,
          skill_a_teaches_b: reactSkill.id,
          skill_b_teaches_a: designSkill.id,
          status: 'active',
        }
      });
      
      // Create chat room
      const chatRoom = await prisma.chatRoom.create({
        data: {
          match_id: match.id,
        }
      });

      // Add dummy messages
      await prisma.message.createMany({
        data: [
          {
            room_id: chatRoom.id,
            sender_id: alice.id,
            content: 'Hi Bob! I saw you want to learn React, and I really need help with UI design for my new project.',
          },
          {
            room_id: chatRoom.id,
            sender_id: bob.id,
            content: 'Hey Alice! That sounds like a perfect match. I can definitely help with your design.',
          }
        ]
      });

      console.log('Created a match and chat history between Alice and Bob.');
    }
  }

  // 4. Create Admin User
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@swapskills.com',
      password_hash: adminPasswordHash,
      role: 'super_admin'
    }
  });
  console.log('Created admin user (username: admin, password: admin123)');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
