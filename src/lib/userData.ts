import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';

export interface UserData {
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: Date;
  emailVerified: boolean;
}

export async function getUserData(user: User): Promise<UserData | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

export async function getUserPhoneNumber(user: User): Promise<string | null> {
  try {
    const userData = await getUserData(user);
    return userData?.phoneNumber || null;
  } catch (error) {
    console.error('Error fetching user phone number:', error);
    return null;
  }
}