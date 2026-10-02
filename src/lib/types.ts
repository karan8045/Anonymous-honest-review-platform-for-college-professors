export type InstitutionSource = 'official_database' | 'user_submitted' | 'owner_added';

export type AvatarType = 'male' | 'female';

export interface User {
  id: string; // Internal UUID
  username: string; // Public pseudonym
  password_hash: string;
  created_at: string;
}

export interface Profile {
  id: string; // References User.id
  username: string;
  name?: string;
  avatar: AvatarType; // Compulsory avatar selection: only 'male' or 'female'
  country: string;
  institution_id: string;
  institution_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  name: string;
  country: string;
  city: string;
  state?: string;
  abbreviations?: string[];
  source: InstitutionSource;
  verified: boolean;
  created_at: string;
  updated_at: string;
  rating_count?: number;
  average_rating?: number;
  opinion_count?: number;
}

export interface Rating {
  id: string;
  institution_id: string;
  user_id: string; // Internal association only
  username?: string;
  name?: string;
  score: number; // 1 to 5
  created_at: string;
  updated_at?: string;
}

export interface Opinion {
  id: string;
  institution_id: string;
  user_id: string; // Internal association only
  username?: string;
  name?: string;
  author_username: string; // Public display pseudonym
  author_avatar?: AvatarType; // Author avatar
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Country {
  name: string;
  code: string;
  flag: string;
}

export interface PublicUserSession {
  id: string;
  username: string;
  avatar: AvatarType;
  country: string;
  institution_id: string;
  institution_name: string;
}
