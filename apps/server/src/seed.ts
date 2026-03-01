/**
 * DB 시드 스크립트 - 개발용 초기 데이터
 * 실행: npx ts-node src/seed.ts
 */
import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'donggamerank',
  synchronize: true,
  entities: ['src/**/*.entity.ts'],
});

const REGIONS = [
  { name: '역삼동', district: '강남구', city: '서울', lat: 37.5007, lng: 127.0368, radius: 2.0 },
  { name: '삼성동', district: '강남구', city: '서울', lat: 37.5088, lng: 127.0632, radius: 2.0 },
  { name: '논현동', district: '강남구', city: '서울', lat: 37.5116, lng: 127.0282, radius: 2.0 },
  { name: '서초동', district: '서초구', city: '서울', lat: 37.4836, lng: 127.0108, radius: 2.5 },
  { name: '잠실동', district: '송파구', city: '서울', lat: 37.5133, lng: 127.1001, radius: 2.5 },
  { name: '홍대입구', district: '마포구', city: '서울', lat: 37.5568, lng: 126.9236, radius: 2.0 },
  { name: '신촌', district: '서대문구', city: '서울', lat: 37.5598, lng: 126.9425, radius: 2.0 },
  { name: '건대입구', district: '광진구', city: '서울', lat: 37.5403, lng: 127.0701, radius: 2.0 },
  { name: '해운대', district: '해운대구', city: '부산', lat: 35.1631, lng: 129.1636, radius: 3.0 },
  { name: '서면', district: '부산진구', city: '부산', lat: 35.1578, lng: 129.0592, radius: 2.5 },
  { name: '동성로', district: '중구', city: '대구', lat: 35.8691, lng: 128.5944, radius: 2.0 },
  { name: '충장로', district: '동구', city: '광주', lat: 35.1471, lng: 126.9190, radius: 2.0 },
];

const SCHOOLS = [
  { name: '서울대학교', type: 'university', domain: 'snu.ac.kr', lat: 37.4601, lng: 126.9510, regionIdx: 3 },
  { name: '연세대학교', type: 'university', domain: 'yonsei.ac.kr', lat: 37.5646, lng: 126.9387, regionIdx: 6 },
  { name: '고려대학교', type: 'university', domain: 'korea.ac.kr', lat: 37.5894, lng: 127.0322, regionIdx: 7 },
  { name: 'KAIST', type: 'university', domain: 'kaist.ac.kr', lat: 36.3721, lng: 127.3604, regionIdx: 0 },
  { name: '성균관대학교', type: 'university', domain: 'skku.edu', lat: 37.5866, lng: 126.9932, regionIdx: 0 },
  { name: '한양대학교', type: 'university', domain: 'hanyang.ac.kr', lat: 37.5570, lng: 127.0463, regionIdx: 7 },
  { name: '숭실대학교', type: 'university', domain: 'ssu.ac.kr', lat: 37.4965, lng: 126.9575, regionIdx: 3 },
  { name: '부산대학교', type: 'university', domain: 'pusan.ac.kr', lat: 35.2314, lng: 129.0847, regionIdx: 8 },
];

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Seeding database...');

  const regionRepo = AppDataSource.getRepository('RegionEntity');
  const schoolRepo = AppDataSource.getRepository('SchoolEntity');
  const seasonRepo = AppDataSource.getRepository('SeasonEntity');

  // Clear
  await seasonRepo.delete({});
  await schoolRepo.delete({});
  await regionRepo.delete({});

  // Regions
  const savedRegions: any[] = [];
  for (const r of REGIONS) {
    const region = await regionRepo.save({
      name: r.name, district: r.district, city: r.city,
      latitude: r.lat, longitude: r.lng, radiusKm: r.radius,
    });
    savedRegions.push(region);
    console.log(`  ✅ Region: ${r.name}`);
  }

  // Schools
  for (const s of SCHOOLS) {
    await schoolRepo.save({
      name: s.name, type: s.type,
      regionId: savedRegions[s.regionIdx]?.id || savedRegions[0].id,
      verifiedDomain: s.domain,
      latitude: s.lat, longitude: s.lng,
    });
    console.log(`  ✅ School: ${s.name}`);
  }

  // Season
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 3);
  await seasonRepo.save({
    name: '시즌 1 - 동네 대결',
    startDate: now,
    endDate,
    isActive: true,
  });
  console.log('  ✅ Season: 시즌 1');

  console.log('\n🎮 Seed complete!');
  await AppDataSource.destroy();
}

seed().catch(console.error);
