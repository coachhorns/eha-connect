import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Spacing, FontSize, BorderRadius, Fonts } from '@/constants/colors';
import { playersApi } from '@/api/players';
import type { PlayerMedia } from '@/types';

const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 80;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_GRID_GAP = Spacing.sm;
const PHOTO_COLS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - PHOTO_GRID_GAP * (PHOTO_COLS - 1)) / PHOTO_COLS;

export default function EditProfileScreen() {
  const { id, slug } = useLocalSearchParams<{ id: string; slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: player, isLoading } = useQuery({
    queryKey: ['playerDetail', slug],
    queryFn: () => playersApi.getBySlug(slug),
    enabled: !!slug,
  });

  const { data: mediaItems = [], refetch: refetchMedia } = useQuery({
    queryKey: ['playerMedia', id],
    queryFn: () => playersApi.getMedia(id),
    enabled: !!id,
  });

  // Form state
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [hudlUrl, setHudlUrl] = useState('');
  const [maxPrepsUrl, setMaxPrepsUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [highlightUrl, setHighlightUrl] = useState('');
  const [gpa, setGpa] = useState('');
  const [transcriptUrl, setTranscriptUrl] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'profilePhoto' | 'photo' | 'video' | 'transcript' | null>(null);

  // Derived media lists
  const photos = mediaItems.filter((m) => m.type === 'PHOTO');
  const videos = mediaItems.filter((m) => m.type === 'VIDEO' || m.type === 'HIGHLIGHT');

  // Pre-populate form when player data loads
  useEffect(() => {
    if (!player) return;
    const p = player as any;
    setBio(p.bio ?? '');
    setEmail(p.email ?? '');
    setInstagramHandle(p.instagramHandle ?? '');
    setTwitterHandle(p.twitterHandle ?? '');
    setHudlUrl(p.hudlUrl ?? '');
    setMaxPrepsUrl(p.maxPrepsUrl ?? '');
    setYoutubeUrl(p.youtubeUrl ?? '');
    setHighlightUrl(p.highlightUrl ?? '');
    setGpa(p.gpa != null ? String(p.gpa) : '');
    setProfilePhoto(p.profilePhoto ?? '');
    setTranscriptUrl(p.transcriptUrl ?? '');
  }, [player]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await playersApi.updatePlayer(id, {
        bio: bio.trim() || null,
        email: email.trim() || null,
        instagramHandle: instagramHandle.trim() || null,
        twitterHandle: twitterHandle.trim() || null,
        hudlUrl: hudlUrl.trim() || null,
        maxPrepsUrl: maxPrepsUrl.trim() || null,
        youtubeUrl: youtubeUrl.trim() || null,
        highlightUrl: highlightUrl.trim() || null,
        gpa: gpa.trim() ? parseFloat(gpa) : null,
        profilePhoto: profilePhoto.trim() || null,
        transcriptUrl: transcriptUrl.trim() || null,
      } as any);

      // Invalidate cached data so profile refreshes
      queryClient.invalidateQueries({ queryKey: ['playerDetail', slug] });
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['guardedPlayers'] });

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Upload helpers ──────────────────────────────────────────

  const uploadFileToBlob = async (
    uri: string,
    mimeType: string,
    fileName: string,
    folder: string
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: mimeType,
      name: fileName,
    } as any);
    formData.append('folder', folder);

    const result = await playersApi.uploadFile(formData);
    return result.url;
  };

  const handleChangeProfilePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploading('profilePhoto');
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() || 'jpg';
      const fileName = `profile_${Date.now()}.${ext}`;
      const mimeType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      const url = await uploadFileToBlob(asset.uri, mimeType, fileName, 'players/profiles');
      setProfilePhoto(url);
      // Save immediately so user sees it right away
      await playersApi.updatePlayer(id, { profilePhoto: url } as any);
      queryClient.invalidateQueries({ queryKey: ['playerDetail', slug] });
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['guardedPlayers'] });
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not update profile photo. Please try again.');
    } finally {
      setUploading(null);
    }
  }, [id, slug, queryClient]);

  const handleAddPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploading('photo');
    try {
      for (const asset of result.assets) {
        const ext = asset.uri.split('.').pop() || 'jpg';
        const fileName = `photo_${Date.now()}.${ext}`;
        const mimeType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        const url = await uploadFileToBlob(asset.uri, mimeType, fileName, 'players/photos');
        await playersApi.createMedia(id, { url, type: 'PHOTO' });
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload photo. Please try again.');
    } finally {
      refetchMedia();
      setUploading(null);
    }
  }, [id, refetchMedia]);

  const handleAddVideo = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploading('video');
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() || 'mp4';
      const fileName = `video_${Date.now()}.${ext}`;
      const mimeType = asset.mimeType || 'video/mp4';

      const url = await uploadFileToBlob(asset.uri, mimeType, fileName, 'players/videos');
      await playersApi.createMedia(id, { url, type: 'VIDEO', title: 'Video' });
      refetchMedia();
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload video. Please try again.');
    } finally {
      setUploading(null);
    }
  }, [id, refetchMedia]);

  const handleUploadTranscript = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/png', 'image/jpeg'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploading('transcript');
    try {
      const asset = result.assets[0];
      const ext = asset.name.split('.').pop() || 'pdf';
      const mimeType = asset.mimeType || 'application/pdf';

      const url = await uploadFileToBlob(asset.uri, mimeType, asset.name, 'players/transcripts');

      // Save transcript URL directly on the player model
      setTranscriptUrl(url);
      await playersApi.updatePlayer(id, { transcriptUrl: url } as any);
      queryClient.invalidateQueries({ queryKey: ['playerDetail', slug] });
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload transcript. Please try again.');
    } finally {
      setUploading(null);
    }
  }, [id, slug, queryClient]);

  const handleDeleteMedia = useCallback(
    (mediaId: string, type: string) => {
      Alert.alert(`Delete ${type === 'PHOTO' ? 'Photo' : 'Video'}?`, 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await playersApi.deleteMedia(id, mediaId);
              refetchMedia();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not delete. Please try again.');
            }
          },
        },
      ]);
    },
    [id, refetchMedia]
  );

  const handleRemoveTranscript = useCallback(() => {
    Alert.alert('Remove Transcript?', 'This will remove the transcript from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setTranscriptUrl('');
            await playersApi.updatePlayer(id, { transcriptUrl: null } as any);
            queryClient.invalidateQueries({ queryKey: ['playerDetail', slug] });
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not remove transcript.');
          }
        },
      },
    ]);
  }, [id, slug, queryClient]);

  // ── Render ──────────────────────────────────────────────────

  if (isLoading || !player) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.red} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { height: HEADER_HEIGHT }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[styles.headerInner, { paddingTop: Platform.OS === 'ios' ? 50 : 30 }]}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT + Spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Profile Photo ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROFILE PHOTO</Text>
          <View style={styles.profilePhotoRow}>
            <View style={styles.profilePhotoWrap}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profilePhotoImg} contentFit="cover" />
              ) : (
                <View style={[styles.profilePhotoImg, styles.profilePhotoPlaceholder]}>
                  <Text style={styles.profilePhotoInitial}>
                    {(player as any).firstName?.[0] || '?'}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.changePhotoBtn}
              onPress={handleChangeProfilePhoto}
              disabled={uploading === 'profilePhoto'}
              activeOpacity={0.7}
            >
              {uploading === 'profilePhoto' ? (
                <ActivityIndicator size="small" color={Colors.gold} />
              ) : (
                <Text style={styles.changePhotoBtnText}>
                  {profilePhoto ? 'Change Photo' : 'Add Photo'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Videos ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VIDEOS</Text>
          {videos.map((video) => (
            <View key={video.id} style={styles.videoRow}>
              <View style={styles.videoThumbWrap}>
                {video.thumbnail ? (
                  <Image source={{ uri: video.thumbnail }} style={styles.videoThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.videoThumb, styles.videoThumbPlaceholder]}>
                    <Text style={styles.videoThumbIcon}>▶</Text>
                  </View>
                )}
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                  {video.title || 'Video'}
                </Text>
                <Text style={styles.videoDate}>
                  {new Date(video.uploadedAt).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.videoDeleteBtn}
                onPress={() => handleDeleteMedia(video.id, 'VIDEO')}
                activeOpacity={0.7}
              >
                <Text style={styles.videoDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddVideo}
            disabled={uploading === 'video'}
            activeOpacity={0.7}
          >
            {uploading === 'video' ? (
              <ActivityIndicator size="small" color={Colors.gold} />
            ) : (
              <Text style={styles.addBtnText}>+ Add Video from Camera Roll</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Transcript ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TRANSCRIPT</Text>
          {transcriptUrl ? (
            <View style={styles.transcriptRow}>
              <View style={styles.transcriptInfo}>
                <Text style={styles.transcriptIcon}>📄</Text>
                <Text style={styles.transcriptLabel}>Transcript Uploaded</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveTranscript} activeOpacity={0.7}>
                <Text style={styles.transcriptRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleUploadTranscript}
              disabled={uploading === 'transcript'}
              activeOpacity={0.7}
            >
              {uploading === 'transcript' ? (
                <ActivityIndicator size="small" color={Colors.gold} />
              ) : (
                <Text style={styles.addBtnText}>+ Upload Transcript (PDF or Image)</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── About Me ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT ME</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={bio}
            onChangeText={setBio}
            placeholder="Write a short bio..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── Socials & Contact ─────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SOCIALS & CONTACT</Text>

          <Text style={styles.fieldLabel}>Contact Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="player@email.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Instagram</Text>
          <TextInput
            style={styles.input}
            value={instagramHandle}
            onChangeText={setInstagramHandle}
            placeholder="username (without @)"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Twitter / X</Text>
          <TextInput
            style={styles.input}
            value={twitterHandle}
            onChangeText={setTwitterHandle}
            placeholder="username (without @)"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        {/* ── Recruiting Links ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RECRUITING LINKS</Text>

          <Text style={styles.fieldLabel}>Hudl Profile</Text>
          <TextInput
            style={styles.input}
            value={hudlUrl}
            onChangeText={setHudlUrl}
            placeholder="https://www.hudl.com/profile/..."
            placeholderTextColor={Colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>MaxPreps Profile</Text>
          <TextInput
            style={styles.input}
            value={maxPrepsUrl}
            onChangeText={setMaxPrepsUrl}
            placeholder="https://www.maxpreps.com/athlete/..."
            placeholderTextColor={Colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>YouTube</Text>
          <TextInput
            style={styles.input}
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            placeholder="https://youtube.com/..."
            placeholderTextColor={Colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Highlight Link</Text>
          <TextInput
            style={styles.input}
            value={highlightUrl}
            onChangeText={setHighlightUrl}
            placeholder="https://..."
            placeholderTextColor={Colors.textMuted}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* ── Academic ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACADEMIC</Text>

          <Text style={styles.fieldLabel}>GPA</Text>
          <TextInput
            style={styles.input}
            value={gpa}
            onChangeText={setGpa}
            placeholder="3.5"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>

        {/* ── Photos Gallery ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PHOTOS</Text>
          <View style={styles.mediaGrid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoItem}>
                <Image source={{ uri: photo.url }} style={styles.photoImage} contentFit="cover" />
                <TouchableOpacity
                  style={styles.mediaDeleteBtn}
                  onPress={() => handleDeleteMedia(photo.id, 'PHOTO')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mediaDeleteText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addMediaTile}
              onPress={handleAddPhoto}
              disabled={uploading === 'photo'}
              activeOpacity={0.7}
            >
              {uploading === 'photo' ? (
                <ActivityIndicator size="small" color={Colors.gold} />
              ) : (
                <>
                  <Text style={styles.addMediaIcon}>+</Text>
                  <Text style={styles.addMediaLabel}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
  },
  headerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  backBtn: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.md,
  },
  backText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.headingBlack,
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.red,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: '#FFFFFF',
  },

  // Content
  scroll: {
    flex: 1,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.heading,
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },

  // ── Profile photo ────────────────────────────────
  profilePhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhotoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  profilePhotoImg: {
    width: '100%',
    height: '100%',
  },
  profilePhotoPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoInitial: {
    fontSize: 36,
    fontFamily: Fonts.headingBlack,
    color: Colors.textMuted,
  },
  changePhotoBtn: {
    marginLeft: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  changePhotoBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.gold,
  },

  // ── Photos grid ──────────────────────────────────
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GRID_GAP,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  mediaDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDeleteText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  addMediaTile: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaIcon: {
    fontSize: 28,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  addMediaLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ── Videos list ──────────────────────────────────
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  videoThumbWrap: {
    width: 64,
    height: 48,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  videoThumbPlaceholder: {
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbIcon: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  videoInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  videoTitle: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  videoDate: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  videoDeleteBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  videoDeleteText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.red,
  },

  // ── Add button (shared) ──────────────────────────
  addBtn: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.gold,
  },

  // ── Transcript row ───────────────────────────────
  transcriptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  transcriptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transcriptIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  transcriptLabel: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textPrimary,
  },
  transcriptRemoveText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.red,
  },
});
