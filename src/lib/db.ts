import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Profile, Institution, Rating, Opinion } from './types';
import { SEED_INSTITUTIONS } from './seed-institutions';

interface DatabaseSchema {
  users: User[];
  profiles: Profile[];
  institutions: Institution[];
  ratings: Rating[];
  opinions: Opinion[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getInitialSeedData(): DatabaseSchema {
  // Initial seed opinions to make the platform immediately rich and engaging
  const seedUserId = 'u0000000-0000-0000-0000-000000000001';
  const seedUsername = 'campusvoice';

  return {
    users: [],
    profiles: [],
    institutions: [...SEED_INSTITUTIONS],
    ratings: [
      {
        id: 'r-cusb-1',
        institution_id: 'inst-in-cusb',
        user_id: seedUserId,
        score: 5,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'r-curaj-1',
        institution_id: 'inst-in-curaj',
        user_id: seedUserId,
        score: 4,
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'r-mit-1',
        institution_id: 'inst-us-mit',
        user_id: seedUserId,
        score: 5,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
    opinions: [
      {
        id: 'op-cusb-1',
        institution_id: 'inst-in-cusb',
        user_id: seedUserId,
        author_username: seedUsername,
        content:
          'Central University of South Bihar has a modern and serene campus in Gaya. Faculty members in the Life Sciences and Law departments are exceptionally dedicated, and research labs are constantly expanding with modern equipment.',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'op-curaj-1',
        institution_id: 'inst-in-curaj',
        user_id: seedUserId,
        author_username: 'student_x',
        content:
          'The Bandarsindri campus is quiet and great for academic focus. Central library is well-stocked and active 24/7 during exam weeks. Highly recommend the Computer Science and Physics programs.',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'op-iitb-1',
        institution_id: 'inst-in-iitb',
        user_id: seedUserId,
        author_username: 'anonymous_coder',
        content:
          'IIT Bombay tech culture is truly world-class. From Mood Indigo to cutting-edge AI research groups, peer learning here is unmatched anywhere in the region.',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        // Sync any new seed institutions that aren't in the saved database yet
        const existingIds = new Set((parsed.institutions || []).map((i: any) => i.id));
        const mergedInstitutions = [...(parsed.institutions || [])];
        let hasNew = false;
        for (const seed of SEED_INSTITUTIONS) {
          if (!existingIds.has(seed.id)) {
            mergedInstitutions.push(seed);
            existingIds.add(seed.id);
            hasNew = true;
          }
        }
        const state: DatabaseSchema = {
          users: parsed.users || [],
          profiles: parsed.profiles || [],
          institutions: mergedInstitutions,
          ratings: parsed.ratings || [],
          opinions: parsed.opinions || [],
        };
        if (hasNew) {
          this.save(state);
        }
        return state;
      }
    } catch (e) {
      console.error('Error loading db.json, initializing seed data:', e);
    }
    const initial = getInitialSeedData();
    this.save(initial);
    return initial;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving db.json:', e);
    }
  }

  // Reload data from disk if updated by another worker/process
  private refresh() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      }
    } catch {
      // ignore
    }
  }

  // --- USER & AUTH ---

  isUsernameValid(username: string): { valid: boolean; reason?: string } {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      return { valid: false, reason: 'Username must be at least 3 characters long.' };
    }
    if (trimmed.length > 30) {
      return { valid: false, reason: 'Username must not exceed 30 characters.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return { valid: false, reason: 'Username can only contain letters, numbers, and underscores.' };
    }
    return { valid: true };
  }

  isUsernameAvailable(username: string): boolean {
    this.refresh();
    const normalized = username.trim().toLowerCase();
    return !this.data.users.some(u => u.username.toLowerCase() === normalized);
  }

  async createUser(params: {
    username: string;
    password: string;
    country: string;
    institution_id: string;
  }): Promise<{ user: User; profile: Profile }> {
    this.refresh();
    const { username, password, country, institution_id } = params;

    const validation = this.isUsernameValid(username);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    if (!this.isUsernameAvailable(username)) {
      throw new Error('This username is already taken. Please choose another.');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // Securely hash password with bcrypt (salt rounds = 10)
    const password_hash = await bcrypt.hash(password, 10);
    const userId = generateUUID();
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      username: username.trim(),
      password_hash,
      created_at: now,
    };

    // Find institution name
    const inst = this.data.institutions.find(i => i.id === institution_id);

    const newProfile: Profile = {
      id: userId,
      username: username.trim(),
      country: country.trim(),
      institution_id,
      institution_name: inst ? inst.name : undefined,
      created_at: now,
      updated_at: now,
    };

    this.data.users.push(newUser);
    this.data.profiles.push(newProfile);
    this.save();

    return { user: newUser, profile: newProfile };
  }

  async verifyUser(params: {
    username: string;
    password: string;
  }): Promise<Profile | null> {
    this.refresh();
    const { username, password } = params;
    const normalized = username.trim().toLowerCase();

    const user = this.data.users.find(u => u.username.toLowerCase() === normalized);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return this.getProfileByUserId(user.id);
  }

  getProfileByUserId(userId: string): Profile | null {
    this.refresh();
    const profile = this.data.profiles.find(p => p.id === userId);
    if (!profile) return null;

    const inst = this.data.institutions.find(i => i.id === profile.institution_id);
    return {
      ...profile,
      institution_name: inst ? inst.name : profile.institution_name,
    };
  }

  // --- INSTITUTIONS & AUTOCOMPLETE ---

  searchInstitutions(options: {
    country?: string;
    query?: string;
    limit?: number;
  }): Institution[] {
    this.refresh();
    const { country, query, limit = 15 } = options;
    let list = [...this.data.institutions];

    // Priority filter by country if provided
    if (country && country.trim()) {
      const normCountry = country.trim().toLowerCase();
      // Sort matching country first
      list = list.filter(i => i.country.toLowerCase() === normCountry);
    }

    if (!query || !query.trim()) {
      return list.slice(0, limit);
    }

    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    interface ScoredInst {
      institution: Institution;
      score: number;
    }

    const scored: ScoredInst[] = [];

    for (const inst of list) {
      const nameNorm = inst.name.toLowerCase();
      const cityNorm = (inst.city || '').toLowerCase();
      const stateNorm = (inst.state || '').toLowerCase();
      const countryNorm = inst.country.toLowerCase();
      const fullLocation = `${cityNorm} ${stateNorm} ${countryNorm}`;
      const abbrevs = (inst.abbreviations || []).map(a => a.toLowerCase());

      // Match score
      let score = 0;

      // Exact name match
      if (nameNorm === q) {
        score += 1000;
      }
      // Name starts with query
      else if (nameNorm.startsWith(q)) {
        score += 500;
      }
      // Abbreviation exact match (e.g., CUSB, MIT, IITB)
      else if (abbrevs.includes(q)) {
        score += 450;
      }
      // Any abbreviation starts with query
      else if (abbrevs.some(a => a.startsWith(q))) {
        score += 300;
      }

      // Check if all tokens match anywhere in (name + location + abbreviations)
      const allTokensMatch = tokens.every(token => {
        return (
          nameNorm.includes(token) ||
          fullLocation.includes(token) ||
          abbrevs.some(a => a.includes(token))
        );
      });

      if (allTokensMatch) {
        score += 100;
        // Bonus for name containing full phrase
        if (nameNorm.includes(q)) {
          score += 50;
        }
        // Verified institutions ranked higher
        if (inst.verified) {
          score += 20;
        }

        scored.push({ institution: inst, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.institution).slice(0, limit);
  }

  getInstitutionById(id: string): Institution | null {
    this.refresh();
    const inst = this.data.institutions.find(i => i.id === id);
    if (!inst) return null;

    const ratings = this.data.ratings.filter(r => r.institution_id === id);
    const opinions = this.data.opinions.filter(o => o.institution_id === id);

    const rating_count = ratings.length;
    const average_rating =
      rating_count > 0
        ? Number((ratings.reduce((acc, curr) => acc + curr.score, 0) / rating_count).toFixed(1))
        : 0;

    return {
      ...inst,
      rating_count,
      average_rating,
      opinion_count: opinions.length,
    };
  }

  createManualInstitution(params: {
    name: string;
    country: string;
    city?: string;
  }): Institution {
    this.refresh();
    const trimmedName = params.name.trim();
    const trimmedCountry = params.country.trim();
    const trimmedCity = (params.city || '').trim();

    if (!trimmedName) {
      throw new Error('College/University name is required.');
    }
    if (!trimmedCountry) {
      throw new Error('Country is required.');
    }

    // Deduplication check: check if already exists with same name & country
    const existing = this.data.institutions.find(
      i =>
        i.name.toLowerCase() === trimmedName.toLowerCase() &&
        i.country.toLowerCase() === trimmedCountry.toLowerCase()
    );

    if (existing) {
      return existing;
    }

    const newInst: Institution = {
      id: `inst-user-${generateUUID().slice(0, 8)}`,
      name: trimmedName,
      country: trimmedCountry,
      city: trimmedCity || 'Unknown City',
      source: 'user_submitted',
      verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.institutions.push(newInst);
    this.save();
    return newInst;
  }

  getAllInstitutions(country?: string): Institution[] {
    this.refresh();
    let list = this.data.institutions;
    if (country) {
      list = list.filter(i => i.country.toLowerCase() === country.toLowerCase());
    }

    return list.map(inst => {
      const ratings = this.data.ratings.filter(r => r.institution_id === inst.id);
      const opinions = this.data.opinions.filter(o => o.institution_id === inst.id);
      const rating_count = ratings.length;
      const average_rating =
        rating_count > 0
          ? Number((ratings.reduce((acc, curr) => acc + curr.score, 0) / rating_count).toFixed(1))
          : 0;

      return {
        ...inst,
        rating_count,
        average_rating,
        opinion_count: opinions.length,
      };
    });
  }

  mergeInstitutions(sourceId: string, targetId: string): { success: boolean; movedRatings: number; movedOpinions: number } {
    this.refresh();
    if (sourceId === targetId) {
      throw new Error('Source and target institution cannot be the same.');
    }

    const sourceInst = this.data.institutions.find(i => i.id === sourceId);
    const targetInst = this.data.institutions.find(i => i.id === targetId);
    if (!sourceInst || !targetInst) {
      throw new Error('Both source and target institutions must exist.');
    }

    let movedRatings = 0;
    let movedOpinions = 0;

    // Migrate ratings while respecting the UNIQUE(user_id, institution_id) constraint
    for (const rating of this.data.ratings) {
      if (rating.institution_id === sourceId) {
        const existingTargetRating = this.data.ratings.find(
          r => r.user_id === rating.user_id && r.institution_id === targetId
        );
        if (!existingTargetRating) {
          rating.institution_id = targetId;
          movedRatings++;
        }
      }
    }
    // Remove remaining duplicate ratings for sourceId
    this.data.ratings = this.data.ratings.filter(r => r.institution_id !== sourceId);

    // Migrate opinions (no duplicate restriction)
    for (const opinion of this.data.opinions) {
      if (opinion.institution_id === sourceId) {
        opinion.institution_id = targetId;
        movedOpinions++;
      }
    }

    // Update profiles attached to sourceId
    for (const profile of this.data.profiles) {
      if (profile.institution_id === sourceId) {
        profile.institution_id = targetId;
        profile.institution_name = targetInst.name;
      }
    }

    // Delete source institution
    this.data.institutions = this.data.institutions.filter(i => i.id !== sourceId);
    this.save();

    return { success: true, movedRatings, movedOpinions };
  }

  // --- RATINGS (STRICT 1 RATING PER USER PER INSTITUTION) ---

  submitRating(params: {
    institution_id: string;
    user_id: string;
    score: number;
  }): Rating {
    this.refresh();
    const { institution_id, user_id, score } = params;

    if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
      throw new Error('Rating score must be an integer between 1 and 5.');
    }

    const inst = this.data.institutions.find(i => i.id === institution_id);
    if (!inst) {
      throw new Error('Institution not found.');
    }

    // Check if rating already exists for (user_id + institution_id)
    const existingIndex = this.data.ratings.findIndex(
      r => r.user_id === user_id && r.institution_id === institution_id
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      // Update existing rating (guaranteeing one rating per user per institution)
      this.data.ratings[existingIndex].score = score;
      this.data.ratings[existingIndex].updated_at = now;
      this.save();
      return this.data.ratings[existingIndex];
    }

    const newRating: Rating = {
      id: generateUUID(),
      institution_id,
      user_id,
      score,
      created_at: now,
    };

    this.data.ratings.push(newRating);
    this.save();
    return newRating;
  }

  getUserRating(user_id: string, institution_id: string): Rating | null {
    this.refresh();
    return (
      this.data.ratings.find(
        r => r.user_id === user_id && r.institution_id === institution_id
      ) || null
    );
  }

  getUserRatingsList(user_id: string): (Rating & { institution_name: string })[] {
    this.refresh();
    const userRatings = this.data.ratings.filter(r => r.user_id === user_id);
    return userRatings.map(r => {
      const inst = this.data.institutions.find(i => i.id === r.institution_id);
      return {
        ...r,
        institution_name: inst ? inst.name : 'Unknown College',
      };
    });
  }

  // --- OPINIONS (UNLIMITED, PSEUDONYMOUS, NO USER DELETE) ---

  createOpinion(params: {
    institution_id: string;
    user_id: string;
    content: string;
  }): Opinion {
    this.refresh();
    const { institution_id, user_id, content } = params;
    const trimmed = (content || '').trim();

    if (trimmed.length < 10) {
      throw new Error('Opinion must be at least 10 characters long.');
    }
    if (trimmed.length > 3000) {
      throw new Error('Opinion cannot exceed 3000 characters.');
    }

    const inst = this.data.institutions.find(i => i.id === institution_id);
    if (!inst) {
      throw new Error('Institution not found.');
    }

    const profile = this.data.profiles.find(p => p.id === user_id);
    const author_username = profile ? profile.username : 'anonymous_student';

    const now = new Date().toISOString();
    const newOpinion: Opinion = {
      id: generateUUID(),
      institution_id,
      user_id,
      author_username,
      content: trimmed,
      created_at: now,
      updated_at: now,
    };

    this.data.opinions.push(newOpinion);
    this.save();
    return newOpinion;
  }

  getOpinionsForInstitution(institution_id: string): Opinion[] {
    this.refresh();
    const list = this.data.opinions.filter(o => o.institution_id === institution_id);
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }

  getUserOpinionsList(user_id: string): (Opinion & { institution_name: string })[] {
    this.refresh();
    const userOpinions = this.data.opinions.filter(o => o.user_id === user_id);
    userOpinions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return userOpinions.map(o => {
      const inst = this.data.institutions.find(i => i.id === o.institution_id);
      return {
        ...o,
        institution_name: inst ? inst.name : 'Unknown College',
      };
    });
  }
}

// Global singleton instance
export const db = new Database();
