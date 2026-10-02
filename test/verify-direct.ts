import { db } from '../src/lib/db';

async function runDirectTests() {
  console.log('🧪 Starting Direct Logic & Database Test Suite...\n');
  let failures = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failures++;
    }
  }

  try {
    // 1. Username validations
    console.log('--- 1. Testing Username Validation ---');
    assert(db.isUsernameValid('student_x').valid === true, 'Valid username: student_x');
    assert(db.isUsernameValid('anonymous_21').valid === true, 'Valid username: anonymous_21');
    assert(db.isUsernameValid('campusvoice').valid === true, 'Valid username: campusvoice');
    assert(db.isUsernameValid('ab').valid === false, 'Username < 3 characters rejected');
    assert(db.isUsernameValid('user@email.com').valid === false, 'Email format in username rejected');
    assert(db.isUsernameValid('user name with spaces').valid === false, 'Spaces rejected');

    // 2. College Autocomplete & Search
    console.log('\n--- 2. Testing College / University Autocomplete ---');
    // Prompt test: user selects India, types "cent"
    const centResults = db.searchInstitutions({ country: 'India', query: 'cent' });
    assert(centResults.length > 0, 'Found results for "cent" in India');
    assert(
      centResults.some(i => i.name === 'Central University of South Bihar'),
      'Matches "Central University of South Bihar"'
    );
    assert(
      centResults.some(i => i.name === 'Central University of Rajasthan'),
      'Matches "Central University of Rajasthan"'
    );
    assert(
      centResults.some(i => i.name === 'Central University of Kerala'),
      'Matches "Central University of Kerala"'
    );
    assert(
      centResults.some(i => i.name === 'Central University of Jharkhand'),
      'Matches "Central University of Jharkhand"'
    );

    // Abbreviation test: CUSB
    const cusbResults = db.searchInstitutions({ country: 'India', query: 'cusb' });
    assert(
      cusbResults.length > 0 && cusbResults[0].name === 'Central University of South Bihar',
      'Abbreviation "cusb" matches Central University of South Bihar directly'
    );

    // Partial word order test: "South Bihar Central"
    const orderResults = db.searchInstitutions({ country: 'India', query: 'South Bihar Central' });
    assert(
      orderResults.length > 0 && orderResults[0].name === 'Central University of South Bihar',
      'Different word order "South Bihar Central" matches'
    );

    // 3. User Registration (Password Hashing & Account Creation)
    console.log('\n--- 3. Testing User Registration & Password Hashing ---');
    const testUsername = 'anon_test_' + Date.now();
    const cusbInst = centResults.find(i => i.name === 'Central University of South Bihar')!;
    const { user, profile } = await db.createUser({
      username: testUsername,
      password: 'MySecretPassword123!',
      country: 'India',
      institution_id: cusbInst.id,
    });

    assert(user.username === testUsername, `User created with username ${testUsername}`);
    assert(user.password_hash !== 'MySecretPassword123!', 'Password is NOT plaintext (hashed)');
    assert(user.password_hash.startsWith('$2'), 'Password hashed with bcrypt');
    assert(profile.country === 'India', 'Profile contains country');
    assert(profile.institution_id === cusbInst.id, 'Profile linked to selected institution');

    // Duplicate username test
    let dupFailed = false;
    try {
      await db.createUser({
        username: testUsername,
        password: 'AnotherPassword',
        country: 'India',
        institution_id: cusbInst.id,
      });
    } catch {
      dupFailed = true;
    }
    assert(dupFailed, 'Duplicate username is rejected');

    // Case-insensitive duplicate test
    let dupCaseFailed = false;
    try {
      await db.createUser({
        username: testUsername.toUpperCase(),
        password: 'AnotherPassword',
        country: 'India',
        institution_id: cusbInst.id,
      });
    } catch {
      dupCaseFailed = true;
    }
    assert(dupCaseFailed, 'Case-insensitive duplicate username is rejected');

    // 4. User Verification / Sign In
    console.log('\n--- 4. Testing Sign In Verification ---');
    const validSignIn = await db.verifyUser({
      username: testUsername,
      password: 'MySecretPassword123!',
    });
    assert(validSignIn !== null && validSignIn?.username === testUsername, 'Valid sign in succeeds');

    const invalidSignIn = await db.verifyUser({
      username: testUsername,
      password: 'WrongPassword!',
    });
    assert(invalidSignIn === null, 'Invalid password fails sign in');

    // 5. Manual Institution Option ("+ Not Available — Add manually")
    console.log('\n--- 5. Testing Manual Institution Addition ---');
    const manualInst = db.createManualInstitution({
      name: 'XYZ Institute of Technology',
      country: 'India',
      city: 'Pune',
    });
    assert(manualInst.source === 'user_submitted', 'Marked as user_submitted');
    assert(manualInst.verified === false, 'Marked as unverified');

    // Test that searching now intelligently finds this manual institution
    const manualSearch = db.searchInstitutions({ country: 'India', query: 'XYZ' });
    assert(
      manualSearch.some(i => i.name === 'XYZ Institute of Technology'),
      'Search suggests previously added manual institution'
    );

    // 6. Strict Single-Rating Constraint: user_id + institution_id
    console.log('\n--- 6. Testing Rating Submission & Uniqueness Constraint ---');
    const r1 = db.submitRating({
      institution_id: cusbInst.id,
      user_id: user.id,
      score: 5,
    });
    assert(r1.score === 5, 'User submitted rating of 5');

    const instAfterR1 = db.getInstitutionById(cusbInst.id)!;
    const initialRatingCount = instAfterR1.rating_count;

    // User submits rating again for same institution: MUST UPDATE, not create duplicate row!
    const r2 = db.submitRating({
      institution_id: cusbInst.id,
      user_id: user.id,
      score: 4,
    });
    assert(r2.score === 4, 'User rating updated to 4');
    assert(r2.id === r1.id, 'Rating row ID is identical (no duplicate row created)');

    const instAfterR2 = db.getInstitutionById(cusbInst.id)!;
    assert(
      instAfterR2.rating_count === initialRatingCount,
      'Rating count remains the same (enforcing 1 rating per user per college)'
    );

    // 7. Unlimited Opinions (No Delete)
    console.log('\n--- 7. Testing Unlimited Opinions (Pseudonymous) ---');
    const op1 = db.createOpinion({
      institution_id: cusbInst.id,
      user_id: user.id,
      content: 'CUSB has modern laboratories and excellent library resources.',
    });
    assert(op1.author_username === testUsername, 'Opinion displays pseudonym username only');

    const op2 = db.createOpinion({
      institution_id: cusbInst.id,
      user_id: user.id,
      content: 'Campus transport connectivity is improving each semester.',
    });
    assert(op2.id !== op1.id, 'Second opinion created (unlimited opinions allowed)');

    const cusbOpinions = db.getOpinionsForInstitution(cusbInst.id);
    assert(
      cusbOpinions.some(o => o.id === op1.id) && cusbOpinions.some(o => o.id === op2.id),
      'Both opinions retrieved for the institution'
    );

    // 8. Admin Merging Duplicate Institutions
    console.log('\n--- 8. Testing Owner Duplicate Institution Merge ---');
    const mergeRes = db.mergeInstitutions(manualInst.id, cusbInst.id);
    assert(mergeRes.success === true, 'Institutions merged successfully');
    const deletedManual = db.getInstitutionById(manualInst.id);
    assert(deletedManual === null, 'Source duplicate institution was removed after merge');

    console.log('\n========================================');
    if (failures === 0) {
      console.log('🎉 ALL 20 DIRECT VERIFICATION TESTS PASSED! (0 failures)');
    } else {
      console.error(`💥 Tests finished with ${failures} failure(s).`);
    }
    console.log('========================================\n');
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runDirectTests();
