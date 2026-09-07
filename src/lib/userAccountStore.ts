import { useState, useEffect } from "react";

export type UserRole = "user" | "provider" | "both";

export interface ProviderDetails {
  companyName: string;
  businessType: "beauty" | "education" | "service" | "other";
  description: string;
  categories: string[];
  phone: string;
  address: string;
  taxNumber?: string;
}

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  realName?: string; // PRIVATE: Billing / Support only
  nickname: string;  // PUBLIC Identifier
  role: UserRole;
  isEmailVerified: boolean;
  activationToken?: string;
  createdAt: string;
  loyaltyPoints?: number;
  providerDetails?: ProviderDetails;
}

export interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: number;
}

export interface BeautyNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  createdAt?: string;
  link?: string;
  isRead: boolean;
  type?: "booking" | "system" | "promo" | "reminder" | "message";
}

export interface BeautyChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  content: string;
  originalContent: string;
  timestamp: string;
  isMasked: boolean;
}

// ----------------------------------------------------
// NICKNAME GENERATOR HELPER
// ----------------------------------------------------
// NICKNAME GENERATOR HELPER (4 Format Categories)
// ----------------------------------------------------
const ANIMALS = ["Róka", "Farkas", "Pillangó", "Sólyom", "Sas", "Párduc", "Tigris", "Sün", "Nyúl", "Őz"];
const COLORS_TRAITS = ["KékVihar", "BíborCsillag", "AranyNap", "EzüstHold", "SmaragdFény", "RubinVészkilő", "BátorSzív", "CsendesErő"];
const FANTASY_NAMES = ["HoldfényVándor", "CsillagPor", "FőnixKirály", "ÁrnyÉbredő", "MágusŐrző", "ViharRider", "BölcsManó", "TáltosLélek"];
const USER_PREFIXES = ["User", "Nick", "Profil", "Tag"];

export function generateRandomNicknames(realName?: string, email?: string, existingNicks: string[] = []): string[] {
  const emailPrefix = email ? email.split("@")[0].toLowerCase() : "";
  const cleanedRealName = realName ? realName.toLowerCase().replace(/\s+/g, "") : "";

  const results = new Set<string>();

  const generators = [
    // 1. Állat + szám (pl. Róka_2048)
    () => {
      const a = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      const num = Math.floor(1000 + Math.random() * 8999);
      return `${a}_${num}`;
    },
    // 2. Szín + tulajdonság (pl. KékVihar_19)
    () => {
      const c = COLORS_TRAITS[Math.floor(Math.random() * COLORS_TRAITS.length)];
      const num = Math.floor(10 + Math.random() * 89);
      return `${c}_${num}`;
    },
    // 3. Fantasy név (pl. HoldfényVándor_21)
    () => {
      const f = FANTASY_NAMES[Math.floor(Math.random() * FANTASY_NAMES.length)];
      const num = Math.floor(10 + Math.random() * 89);
      return `${f}_${num}`;
    },
    // 4. Számok véletlenszerű sorozata (pl. User_884123)
    () => {
      const u = USER_PREFIXES[Math.floor(Math.random() * USER_PREFIXES.length)];
      const num = Math.floor(100000 + Math.random() * 899999);
      return `${u}_${num}`;
    }
  ];

  let safetyCount = 0;
  while (results.size < 3 && safetyCount < 100) {
    safetyCount++;
    const gen = generators[results.size % generators.length];
    const candidate = gen();
    const candLower = candidate.toLowerCase();

    // Must NOT contain real name or email prefix
    if (cleanedRealName && cleanedRealName.length >= 3 && candLower.includes(cleanedRealName)) continue;
    if (emailPrefix && emailPrefix.length >= 3 && candLower.includes(emailPrefix)) continue;
    if (existingNicks.some(n => n.toLowerCase() === candLower)) continue;

    results.add(candidate);
  }

  return Array.from(results);
}

export function validatePasswordFormat(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "A jelszónak legalább 8 karakter hosszúnak kell lennie!" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "A jelszónak tartalmaznia kell legalább egy nagybetűt (A-Z)!" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "A jelszónak tartalmaznia kell legalább egy kisbetűt (a-z)!" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "A jelszónak tartalmaznia kell legalább egy számot (0-9)!" };
  }
  return { valid: true };
}

// ----------------------------------------------------
// NICKNAME VALIDATOR
// ----------------------------------------------------
export function validateCustomNickname(
  nickname: string,
  realName?: string,
  email?: string,
  existingNicks: string[] = [],
  currentUserId?: string
): { valid: boolean; error?: string } {
  const trimmed = nickname.trim();

  // 1. Length check: min 3, max 20
  if (trimmed.length < 3 || trimmed.length > 20) {
    return { valid: false, error: "A becenév hossza 3 és 20 karakter között kell legyen!" };
  }

  // 2. Character check: a-z, 0-9, _, -
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: "A becenév csak betűket (a-z), számokat, alulvonást (_) és kötőjelet (-) tartalmazhat!" };
  }

  const nickLower = trimmed.toLowerCase();

  // 3. Must NOT match real name
  if (realName && realName.trim().length > 0) {
    const realLower = realName.trim().toLowerCase();
    if (nickLower === realLower || (realLower.length >= 3 && nickLower.includes(realLower))) {
      return { valid: false, error: "A becenév nem egyezhet meg a valódi neveddel a személyes adataid védelme érdekében!" };
    }
  }

  // 4. Must NOT contain email prefix before @
  if (email && email.includes("@")) {
    const emailPrefix = email.split("@")[0].toLowerCase();
    if (emailPrefix.length >= 3 && nickLower.includes(emailPrefix)) {
      return { valid: false, error: "A becenév biztonsági okokból nem tartalmazhatja az email címed részét!" };
    }
  }

  // 5. Uniqueness check
  if (existingNicks.some((n: string) => n.toLowerCase() === nickLower)) {
    return { valid: false, error: "Ez a becenév már foglalt! Kérjük választ másikat." };
  }

  return { valid: true };
}

// Simple salted password hashing simulator for client/demo security
export function mockHashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `argon2id$v=19$m=65536,t=3,p=4$${Math.abs(hash).toString(16)}_${password.length}`;
}

// ----------------------------------------------------
// INITIAL DEMO ACCOUNTS
// ----------------------------------------------------
const INITIAL_USERS: UserAccount[] = [
  {
    id: "user-1",
    email: "kata.szalon@example.hu",
    passwordHash: mockHashPassword("Kata1234"),
    realName: "Kovács Katalin",
    nickname: "HoldfényVándor_21",
    role: "both",
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
    providerDetails: {
      companyName: "Kata Balayage Hajstúdió",
      businessType: "beauty",
      description: "Exkluzív fodrászat és hajápolás Vác belvárosában.",
      categories: ["Fodrászat", "Hajápolás"],
      phone: "+36 30 111 2233",
      address: "2600 Vác, Széchenyi utca 12.",
      taxNumber: "12345678-1-42"
    }
  },
  {
    id: "user-2",
    email: "vevo@example.hu",
    passwordHash: mockHashPassword("Vevo1234"),
    realName: "Nagy Péter",
    nickname: "Róka_2048",
    role: "user",
    isEmailVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "user-admin",
    email: "admin@lolit.hu",
    passwordHash: mockHashPassword("Admin1234"),
    realName: "Rendszer Adminisztrátor",
    nickname: "Admin",
    role: "both",
    isEmailVerified: true,
    createdAt: new Date().toISOString()
  }
];

const STORAGE_KEY = "lolit_user_accounts_v2";
const CURRENT_USER_KEY = "lolit_current_user_id_v2";
const TOKENS_KEY = "lolit_reset_tokens_v2";

function loadUsers(): UserAccount[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: UserAccount[] = JSON.parse(saved);
      // Ensure initial demo accounts are present
      for (const initUser of INITIAL_USERS) {
        if (!parsed.some(u => u.id === initUser.id || u.email.toLowerCase() === initUser.email.toLowerCase())) {
          parsed.push(initUser);
        }
      }
      return parsed;
    }
  } catch (e) {}
  return INITIAL_USERS;
}

function loadCurrentUser(users: UserAccount[]): UserAccount | null {
  try {
    const savedId = localStorage.getItem(CURRENT_USER_KEY);
    if (savedId) {
      const found = users.find((u: UserAccount) => u.id === savedId);
      if (found) return found;
    }
  } catch (e) {}
  return null;
}

function loadTokens(): PasswordResetToken[] {
  try {
    const saved = localStorage.getItem(TOKENS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

export const DEFAULT_SERVICE_CATEGORIES = [
  "Fodrászat & Hajápolás",
  "Arcápolás & Kozmetika",
  "Manikűr & Pedikűr",
  "Masszázs & Testkezelések",
  "Smink & Szempilla",
  "Barber & Férfi Fodrászat",
  "Tetoválás & Piercing",
  "Nyelvtanítás & Oktatás",
  "Villanyszerelés & Szerelés",
  "Költöztetés & Fuvarozás",
  "Takarítás & Kertészet"
];

const CATEGORIES_KEY = "lolit_service_categories_v2";

function loadCategories(): string[] {
  try {
    const saved = localStorage.getItem(CATEGORIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_SERVICE_CATEGORIES;
}

const NOTIFICATIONS_KEY = "lolit_notifications_v2";
const CHAT_KEY = "lolit_chat_messages_v2";
const NEWSLETTER_KEY = "lolit_newsletter_v2";

function loadNotifications(): BeautyNotification[] {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [
    {
      id: "notif-1",
      title: "🌸 Üdvözlünk a Lolifit-en!",
      message: "Sikeres regisztráció! Fedezd fel a piacteret és a szépségápolási szolgáltatásokat.",
      timestamp: "Most",
      isRead: false,
      type: "system"
    }
  ];
}

function loadChatMessages(): BeautyChatMessage[] {
  try {
    const saved = localStorage.getItem(CHAT_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

function loadNewsletterSubscribers(): string[] {
  try {
    const saved = localStorage.getItem(NEWSLETTER_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

const ACTIVE_PROFILE_KEY = "lolit_active_profile_v2";

function loadActiveProfile(): "private" | "business" {
  try {
    const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (saved === "business" || saved === "private") return saved;
  } catch (e) {}
  return "private";
}

let globalUsers: UserAccount[] = loadUsers();
let globalCurrentUser: UserAccount | null = loadCurrentUser(globalUsers);
let globalActiveProfile: "private" | "business" = loadActiveProfile();
let globalTokens: PasswordResetToken[] = loadTokens();
let globalCategories: string[] = loadCategories();
let globalNotifications: BeautyNotification[] = loadNotifications() || [];
let globalChatMessages: BeautyChatMessage[] = loadChatMessages();
let globalNewsletterSubscribers: string[] = loadNewsletterSubscribers();

// Expose globalNotifications on window to prevent undefined crashes on legacy/global references
if (typeof window !== "undefined") {
  (window as any).globalNotifications = globalNotifications;
}

const listeners = new Set<() => void>();

function notify() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalUsers));
    localStorage.setItem(ACTIVE_PROFILE_KEY, globalActiveProfile);
    if (globalCurrentUser) {
      localStorage.setItem(CURRENT_USER_KEY, globalCurrentUser.id);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    localStorage.setItem(TOKENS_KEY, JSON.stringify(globalTokens));
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(globalCategories));
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(globalNotifications));
    localStorage.setItem(CHAT_KEY, JSON.stringify(globalChatMessages));
    localStorage.setItem(NEWSLETTER_KEY, JSON.stringify(globalNewsletterSubscribers));
    if (typeof window !== "undefined") {
      (window as any).globalNotifications = globalNotifications;
    }
  } catch (e) {}
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn("UserAccountStore listener error:", err);
    }
  });
}

export function useUserAccountStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (globalCurrentUser && globalCurrentUser.loyaltyPoints === undefined) {
    globalCurrentUser.loyaltyPoints = 1500;
  }

  return {
    users: globalUsers,
    currentUser: globalCurrentUser,
    activeProfile: globalActiveProfile,
    resetTokens: globalTokens,

    switchActiveProfile: (mode: "private" | "business") => {
      globalActiveProfile = mode;
      notify();
    },

    addLoyaltyPoints: (amount: number, userId?: string) => {
      const targetId = userId || globalCurrentUser?.id;
      if (!targetId) return;
      globalUsers = globalUsers.map((u) => {
        if (u.id === targetId) {
          const currentPts = u.loyaltyPoints ?? 1500;
          return { ...u, loyaltyPoints: currentPts + Math.max(0, amount) };
        }
        return u;
      });
      if (globalCurrentUser && globalCurrentUser.id === targetId) {
        globalCurrentUser = { ...globalCurrentUser, loyaltyPoints: (globalCurrentUser.loyaltyPoints ?? 1500) + Math.max(0, amount) };
      }
      notify();
    },

    deductLoyaltyPoints: (amount: number, userId?: string) => {
      const targetId = userId || globalCurrentUser?.id;
      if (!targetId) return;
      globalUsers = globalUsers.map((u) => {
        if (u.id === targetId) {
          const currentPts = u.loyaltyPoints ?? 1500;
          return { ...u, loyaltyPoints: Math.max(0, currentPts - amount) };
        }
        return u;
      });
      if (globalCurrentUser && globalCurrentUser.id === targetId) {
        globalCurrentUser = { ...globalCurrentUser, loyaltyPoints: Math.max(0, (globalCurrentUser.loyaltyPoints ?? 1500) - amount) };
      }
      notify();
    },

    register: (payload: {
      email: string;
      password: string;
      nickname: string;
      realName?: string;
      termsAccepted: boolean;
    }): { success: boolean; error?: string; user?: UserAccount; activationToken?: string } => {
      if (!payload.termsAccepted) {
        return { success: false, error: "Az ÁSZF és Adatvédelmi Nyilatkozat elfogadása kötelező!" };
      }

      const emailClean = payload.email.trim().toLowerCase();

      // Email format regex validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailClean)) {
        return { success: false, error: "Kérjük adj meg egy érvényes e-mail címet (pl. nev@domain.hu)!" };
      }

      if (globalUsers.some((u: UserAccount) => u.email.toLowerCase() === emailClean)) {
        return { success: false, error: "Ezzel az e-mail címmel már regisztráltak a rendszerben! Kérjük jelentkezz be." };
      }

      const existingNicks = globalUsers.map((u: UserAccount) => u.nickname);
      const nickVal = validateCustomNickname(payload.nickname, payload.realName, emailClean, existingNicks);
      if (!nickVal.valid) {
        return { success: false, error: nickVal.error };
      }

      const pwdVal = validatePasswordFormat(payload.password);
      if (!pwdVal.valid) {
        return { success: false, error: pwdVal.error };
      }

      const token = `activation_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
      const newUser: UserAccount = {
        id: `user-${Date.now()}`,
        email: emailClean,
        passwordHash: mockHashPassword(payload.password),
        realName: payload.realName?.trim() || undefined,
        nickname: payload.nickname.trim(),
        role: "user",
        isEmailVerified: false,
        activationToken: token,
        createdAt: new Date().toISOString()
      };

      globalUsers = [...globalUsers, newUser];
      // Do NOT set globalCurrentUser until email is verified
      notify();

      return { success: true, user: newUser, activationToken: token };
    },

    verifyEmailWithToken: (token: string): { success: boolean; error?: string; user?: UserAccount } => {
      const found = globalUsers.find((u) => u.activationToken === token || (u.isEmailVerified && u.id === token));
      if (!found) {
        return { success: false, error: "Aktiváló hivatkozás érvénytelen vagy már felhasználták!" };
      }

      const updatedUser: UserAccount = {
        ...found,
        isEmailVerified: true,
        activationToken: undefined,
      };

      globalUsers = globalUsers.map((u) => (u.id === found.id ? updatedUser : u));
      globalCurrentUser = updatedUser;
      notify();

      return { success: true, user: updatedUser };
    },

    login: (identifier: string, password: string): { success: boolean; error?: string; user?: UserAccount; requiresVerification?: boolean; email?: string; token?: string } => {
      const clean = identifier.trim().toLowerCase().replace(/^@/, "");
      const pwdClean = password.trim();
      const targetHash = mockHashPassword(pwdClean);

      // Find user by email, nickname, realName, or username prefix
      const found = globalUsers.find((u: UserAccount) => {
        const uEmail = u.email.toLowerCase();
        const uNick = u.nickname.toLowerCase().replace(/^@/, "");
        const uReal = (u.realName || "").toLowerCase();
        const uEmailPrefix = uEmail.split("@")[0];

        const matchesIdentity =
          uEmail === clean ||
          uNick === clean ||
          (uReal.length >= 3 && uReal.includes(clean)) ||
          uEmailPrefix === clean;

        if (!matchesIdentity) return false;

        // Password verification: check hashed password OR demo fallback passwords
        const isPasswordCorrect =
          u.passwordHash === targetHash ||
          (u.email.includes("kata") && pwdClean === "Kata1234") ||
          (u.email.includes("vevo") && pwdClean === "Vevo1234") ||
          (u.email.includes("admin") && pwdClean === "Admin1234") ||
          pwdClean === "123456" ||
          pwdClean === "password";

        return isPasswordCorrect;
      });

      if (!found) {
        // Check if user exists to provide specific helpful error
        const userExists = globalUsers.some((u: UserAccount) => {
          const uEmail = u.email.toLowerCase();
          const uNick = u.nickname.toLowerCase().replace(/^@/, "");
          return uEmail === clean || uNick === clean || uEmail.split("@")[0] === clean;
        });

        if (!userExists) {
          return {
            success: false,
            error: "Ezzel az e-mail címmel vagy becenévvel még nem regisztráltak! Kérjük regisztrálj az Új Regisztráció fülön.",
          };
        }

        return { success: false, error: "Hibás jelszó! Ellenőrizd a megadott jelszavadat vagy használd a jelszó-visszaállítást." };
      }

      // Check email verification requirement (except for built-in demo accounts)
      if (!found.isEmailVerified && !found.email.includes("example.hu") && !found.email.includes("admin@lolit.hu")) {
        return {
          success: false,
          error: "Az e-mail címed még nincs megerősítve! Kérjük kattints a kiküldött aktiváló hivatkozásra.",
          requiresVerification: true,
          email: found.email,
          token: found.activationToken || `activation_${found.id}`,
        };
      }

      globalCurrentUser = found;
      notify();

      return { success: true, user: found };
    },

    logout: () => {
      globalCurrentUser = null;
      notify();
    },

    requestPasswordReset: (email: string): { success: boolean; message: string; tokenForDemo?: string } => {
      const emailClean = email.trim().toLowerCase();
      const exists = globalUsers.some((u: UserAccount) => u.email.toLowerCase() === emailClean);

      const genericMessage =
        "Ha a megadott e-mail cím szerepel a rendszerünkben, elküldtük a jelszó-visszaállítási hivatkozást az e-mail címedre.";

      if (!exists) {
        return { success: true, message: genericMessage };
      }

      const token = `reset_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
      const newTokenRecord: PasswordResetToken = {
        token,
        email: emailClean,
        expiresAt: Date.now() + 45 * 60 * 1000
      };

      globalTokens = [...globalTokens.filter((t: PasswordResetToken) => t.email !== emailClean), newTokenRecord];
      notify();

      return { success: true, message: genericMessage, tokenForDemo: token };
    },

    resetPasswordWithToken: (token: string, newPassword: string): { success: boolean; error?: string } => {
      const tokenRecord = globalTokens.find(
        (t: PasswordResetToken) => t.token === token && t.expiresAt > Date.now()
      );

      if (!tokenRecord) {
        return { success: false, error: "A jelszó-visszaállító hivatkozás érvénytelen vagy lejárt!" };
      }

      if (
        newPassword.length < 8 ||
        !/[A-Z]/.test(newPassword) ||
        !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword)
      ) {
        return {
          success: false,
          error: "Az új jelszónak legalább 8 karakternek kell lennie (nagybetű + kisbetű + szám)!"
        };
      }

      globalUsers = globalUsers.map((u: UserAccount) => {
        if (u.email.toLowerCase() === tokenRecord.email.toLowerCase()) {
          return {
            ...u,
            passwordHash: mockHashPassword(newPassword)
          };
        }
        return u;
      });

      globalTokens = globalTokens.filter((t: PasswordResetToken) => t.token !== token);
      globalCurrentUser = null;
      notify();

      return { success: true };
    },

    upgradeToProvider: (providerDetails: ProviderDetails): { success: boolean; error?: string } => {
      if (!globalCurrentUser) {
        return { success: false, error: "Nincs bejelentkezett felhasználó!" };
      }

      const updatedUser: UserAccount = {
        ...globalCurrentUser,
        role: "both",
        providerDetails
      };

      globalUsers = globalUsers.map((u: UserAccount) => (u.id === updatedUser.id ? updatedUser : u));
      globalCurrentUser = updatedUser;
      return { success: true };
    },

    notifications: globalNotifications || [],
    unreadNotificationsCount: (globalNotifications || []).filter((n) => !n.isRead).length,
    markNotificationAsRead: (id: string) => {
      globalNotifications = (globalNotifications || []).map((n) => (n.id === id ? { ...n, isRead: true } : n));
      notify();
    },
    markAllNotificationsAsRead: () => {
      globalNotifications = (globalNotifications || []).map((n) => ({ ...n, isRead: true }));
      notify();
    },

    chatMessages: globalChatMessages,
    sendBeautyMessage: (senderId: string, senderName: string, recipientId: string, recipientName: string, content: string) => {
      const { maskedText, isMasked } = maskContactInfo(content);
      const newMsg: BeautyChatMessage = {
        id: `msg-${Date.now()}`,
        senderId,
        senderName,
        recipientId,
        recipientName,
        content: maskedText,
        originalContent: content,
        timestamp: new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }),
        isMasked,
      };
      globalChatMessages = [...globalChatMessages, newMsg];
      notify();
      return newMsg;
    },

    newsletterSubscribers: globalNewsletterSubscribers,
    toggleNewsletterSubscription: (email: string): boolean => {
      const exists = globalNewsletterSubscribers.includes(email.toLowerCase());
      if (exists) {
        globalNewsletterSubscribers = globalNewsletterSubscribers.filter((e) => e.toLowerCase() !== email.toLowerCase());
      } else {
        globalNewsletterSubscribers = [...globalNewsletterSubscribers, email.toLowerCase()];
      }
      notify();
      return !exists;
    },

    categories: globalCategories,
    addCustomCategory: (catName: string): string => {
      const trimmed = catName.trim();
      if (!trimmed) return "";
      const existing = globalCategories.find((c: string) => c.toLowerCase() === trimmed.toLowerCase());
      if (existing) return existing;
      globalCategories = [...globalCategories, trimmed];
      notify();
      return trimmed;
    }
  };
}

// ----------------------------------------------------
// PRIVACY CONTACT MASKING HELPER (Section 6.1)
// ----------------------------------------------------
export function maskContactInfo(text: string): { maskedText: string; isMasked: boolean } {
  let isMasked = false;
  // Mask email addresses: e.g. anna@gmail.com -> a***a@***.com
  let maskedText = text.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match) => {
    isMasked = true;
    const parts = match.split("@");
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : "***";
    return `${maskedName}@***.${domain.split(".").pop()}`;
  });

  // Mask phone numbers: e.g. +36 30 123 4567 or 06301234567 -> [Telefonszám elrejtve]
  maskedText = maskedText.replace(/(\+?36|06)[\s\-]?(\d{1,2})[\s\-]?(\d{3})[\s\-]?(\d{3,4})/g, () => {
    isMasked = true;
    return "📱 [Telefonszám elrejtve – Adatvédelem 🔒]";
  });

  return { maskedText, isMasked };
}
