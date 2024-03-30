import { firestore } from '@/config/firebase';

export const updatePlayerStats = async (uid: string, points: number, didWin = false) => {
  const profileSnap = await firestore.collection('users').doc(uid).get();
  if (!profileSnap.exists) return;
  const currStats = profileSnap.data().stats;
  if (!currStats) return;

  currStats.matches += 1;
  currStats.wins += didWin ? 1 : 0;
  currStats.points += points;

  firestore.collection('users').doc(uid).update({ stats: currStats });
};
