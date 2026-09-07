import { useMemo } from "react";
import { useUserAccountStore, type UserAccount } from "./userAccountStore";

export interface AppAuthUser {
  id: string;
  primaryEmailAddress?: { emailAddress: string };
  email?: string;
  username?: string;
  fullName?: string;
  imageUrl?: string;
}

export function useAppAuth() {
  const { currentUser } = useUserAccountStore();

  const isSignedIn = !!currentUser;
  const user: AppAuthUser | null = useMemo(() => {
    if (!currentUser) return null;
    return {
      id: currentUser.id,
      primaryEmailAddress: { emailAddress: currentUser.email },
      email: currentUser.email,
      username: currentUser.nickname,
      fullName: currentUser.realName || currentUser.nickname,
      imageUrl: undefined,
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.nickname, currentUser?.realName]);

  return {
    isLoaded: true,
    isSignedIn,
    user,
    currentUser,
  };
}
