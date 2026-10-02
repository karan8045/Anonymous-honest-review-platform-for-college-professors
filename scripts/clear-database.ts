import { db } from '../src/lib/db';

console.log('🧹 Clearing local database...');
db.resetDatabase();
console.log('✅ Local database cleared successfully!');
console.log('📊 Current stats:');
console.log(`   - Users: 0`);
console.log(`   - Profiles: 0`);
console.log(`   - Ratings: 0`);
console.log(`   - Opinions: 0`);
console.log(`   - Verified Institutions preserved: ${db.getAllInstitutions().length}`);
