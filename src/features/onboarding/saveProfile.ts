import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import type { OnboardingData } from '../../store/onboardingStore';

export function ageFromDob(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

const toIsoDate = (value: string) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

async function uploadPhoto(userId: string, uri: string, index: number): Promise<string> {
  if (uri.startsWith('http')) return uri; // já está no Storage

  const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
  const fileName = `${userId}/${Date.now()}_${index}.${safeExt}`;

  let body: ArrayBuffer | Blob;
  if (Platform.OS === 'web') {
    body = await (await fetch(uri)).blob();
  } else {
    body = decode(await FileSystem.readAsStringAsync(uri, { encoding: 'base64' }));
  }

  const { error } = await supabase.storage.from('avatars').upload(fileName, body, {
    contentType: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
    upsert: true,
  });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
}

/** Envia as fotos e grava o perfil. Lança Error com mensagem pronta para o usuário. */
export async function saveProfile(data: OnboardingData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sua sessão expirou. Entre de novo para terminar o perfil.');

  const age = ageFromDob(data.dob);
  if (age === null || age < 18) throw new Error('O Romy é exclusivo para maiores de 18 anos.');

  // Upload sem fallback para URI local: um caminho do aparelho não abre para mais ninguém.
  const photos: string[] = [];
  for (let i = 0; i < data.photos.length; i++) {
    try {
      photos.push(await uploadPhoto(user.id, data.photos[i], i));
    } catch (err) {
      console.warn('Falha ao enviar foto', i, err);
    }
  }
  if (photos.length === 0) {
    throw new Error('Não conseguimos enviar suas fotos. Verifique a conexão e tente de novo.');
  }

  const { error } = await supabase
    .from('users')
    .update({
      name: data.name.trim(),
      dob: data.dob,
      city: data.city.trim(),
      sex: data.sex,
      bio: data.bio.trim(),
      photos,
      languages: data.languages,

      destination: data.destination.trim(),
      check_in: data.isFlexible ? null : toIsoDate(data.checkIn),
      check_out: data.isFlexible ? null : toIsoDate(data.checkOut),
      is_flexible: data.isFlexible,
      companions: data.companions,
      travel_styles: data.travelStyles,
      interests: data.interests,
      budget: data.budget,

      cost_split: data.costSplit,
      group_travel: data.group,
      one_person: data.onePerson,
      invitations: data.invitations,
      connection_intentions: data.connectionIntentions,
      gender_preference: data.genderPreference,
    })
    .eq('id', user.id);

  if (error) throw new Error('Não foi possível salvar seu perfil. Tente de novo em instantes.');
  return { photos };
}
