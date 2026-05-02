export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface TravelStory {
  id: string
  user_id: string
  title: string
  description: string
  location: string
  latitude: number | null
  longitude: number | null
  photos: string[]
  is_saved: boolean
  created_at: string
  updated_at: string
  profiles: {
    username: string
    avatar_url: string
    username: string
  }
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      arcade_progress: {
        Row: {
          achievements: string[]
          created_at: string
          favorite_game: string | null
          games_played: Json
          high_scores: Json
          id: string
          level: number
          total_playtime: number
          unlocked_themes: string[]
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          achievements?: string[]
          created_at?: string
          favorite_game?: string | null
          games_played?: Json
          high_scores?: Json
          id?: string
          level?: number
          total_playtime?: number
          unlocked_themes?: string[]
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          achievements?: string[]
          created_at?: string
          favorite_game?: string | null
          games_played?: Json
          high_scores?: Json
          id?: string
          level?: number
          total_playtime?: number
          unlocked_themes?: string[]
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      challenge_submissions: {
        Row: {
          challenge_id: string
          created_at: string | null
          id: string
          proof_type: string | null
          proof_url: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string | null
          id?: string
          proof_type?: string | null
          proof_url?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string | null
          id?: string
          proof_type?: string | null
          proof_url?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          location_required: boolean | null
          points: number | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          location_required?: boolean | null
          points?: number | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          location_required?: boolean | null
          points?: number | null
          title?: string
        }
        Relationships: []
      }
      chat_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_groups: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_settings: {
        Row: {
          chat_user_id: string
          created_at: string | null
          disappear_timer: number | null
          emoji_reaction: string | null
          id: string
          is_archived: boolean | null
          is_muted: boolean | null
          is_private: boolean | null
          mute_until: string | null
          nickname: string | null
          theme_color: string | null
          updated_at: string | null
          user_id: string
          wallpaper: string | null
        }
        Insert: {
          chat_user_id: string
          created_at?: string | null
          disappear_timer?: number | null
          emoji_reaction?: string | null
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          is_private?: boolean | null
          mute_until?: string | null
          nickname?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id: string
          wallpaper?: string | null
        }
        Update: {
          chat_user_id?: string
          created_at?: string | null
          disappear_timer?: number | null
          emoji_reaction?: string | null
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          is_private?: boolean | null
          mute_until?: string | null
          nickname?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string
          wallpaper?: string | null
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          reaction: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          document_id: string | null
          id: string
          post_id: string | null
          reference_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          post_id?: string | null
          reference_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          post_id?: string | null
          reference_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_challenges: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_drafts: {
        Row: {
          background: string
          canvas_data: Json
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          background?: string
          canvas_data?: Json
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          background?: string
          canvas_data?: Json
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_posts: {
        Row: {
          audience: string
          background: string
          canvas_data: Json
          created_at: string
          expires_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          audience?: string
          background?: string
          canvas_data?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          audience?: string
          background?: string
          canvas_data?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discover_visits: {
        Row: {
          id: string
          place_id: string
          user_id: string
          visited_at: string | null
        }
        Insert: {
          id?: string
          place_id: string
          user_id: string
          visited_at?: string | null
        }
        Update: {
          id?: string
          place_id?: string
          user_id?: string
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discover_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reactions: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          reaction?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_reactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          listing_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          listing_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          listing_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_comments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_likes: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_likes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category: string | null
          comments_count: number | null
          condition: string | null
          created_at: string
          currency: string | null
          description: string | null
          extra_data: Json | null
          id: string
          likes_count: number | null
          location: string | null
          media_types: string[] | null
          media_urls: string[] | null
          negotiable: boolean | null
          payment_methods: string[] | null
          price: number | null
          qualification: string | null
          salary_range: string | null
          status: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          category?: string | null
          comments_count?: number | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          extra_data?: Json | null
          id?: string
          likes_count?: number | null
          location?: string | null
          media_types?: string[] | null
          media_urls?: string[] | null
          negotiable?: boolean | null
          payment_methods?: string[] | null
          price?: number | null
          qualification?: string | null
          salary_range?: string | null
          status?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          category?: string | null
          comments_count?: number | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          extra_data?: Json | null
          id?: string
          likes_count?: number | null
          location?: string | null
          media_types?: string[] | null
          media_urls?: string[] | null
          negotiable?: boolean | null
          payment_methods?: string[] | null
          price?: number | null
          qualification?: string | null
          salary_range?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      marketplace_profiles: {
        Row: {
          allow_reviews: boolean | null
          area: string | null
          availability: string[] | null
          bio: string | null
          created_at: string
          username: string | null
          id: string
          is_phone_verified: boolean | null
          location: string | null
          payment_methods: string[] | null
          phone: string | null
          qualification: string | null
          response_time: string | null
          seller_type: string | null
          selling_categories: string[] | null
          show_phone_to: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
          whatsapp_same: boolean | null
        }
        Insert: {
          allow_reviews?: boolean | null
          area?: string | null
          availability?: string[] | null
          bio?: string | null
          created_at?: string
          username?: string | null
          id?: string
          is_phone_verified?: boolean | null
          location?: string | null
          payment_methods?: string[] | null
          phone?: string | null
          qualification?: string | null
          response_time?: string | null
          seller_type?: string | null
          selling_categories?: string[] | null
          show_phone_to?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
          whatsapp_same?: boolean | null
        }
        Update: {
          allow_reviews?: boolean | null
          area?: string | null
          availability?: string[] | null
          bio?: string | null
          created_at?: string
          username?: string | null
          id?: string
          is_phone_verified?: boolean | null
          location?: string | null
          payment_methods?: string[] | null
          phone?: string | null
          qualification?: string | null
          response_time?: string | null
          seller_type?: string | null
          selling_categories?: string[] | null
          show_phone_to?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
          whatsapp_same?: boolean | null
        }
        Relationships: []
      }
      marketplace_saved: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_saved_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          deleted_for: Json | null
          edited_at: string | null
          group_id: string | null
          id: string
          is_forwarded: boolean | null
          is_read: boolean | null
          media_type: string | null
          media_url: string | null
          original_message_id: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_for?: Json | null
          edited_at?: string | null
          group_id?: string | null
          id?: string
          is_forwarded?: boolean | null
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          original_message_id?: string | null
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_for?: Json | null
          edited_at?: string | null
          group_id?: string | null
          id?: string
          is_forwarded?: boolean | null
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          original_message_id?: string | null
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_original_message_id_fkey"
            columns: ["original_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
          visibility?: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          from_user_id: string
          id: string
          is_read: boolean | null
          link: string | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          from_user_id: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          from_user_id?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_tracks: {
        Row: {
          artist: string | null
          created_at: string | null
          duration: number | null
          file_url: string | null
          id: string
          playlist_id: string
          title: string
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          duration?: number | null
          file_url?: string | null
          id?: string
          playlist_id: string
          title: string
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          duration?: number | null
          file_url?: string | null
          id?: string
          playlist_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          shared_with_user_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          shared_with_user_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          shared_with_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          allow_comments: boolean
          allow_sharing: boolean
          audience: string
          bg_color: string | null
          category: string
          content: string | null
          created_at: string | null
          expires_at: string | null
          feeling: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_anonymous: boolean
          is_private: boolean
          likes_count: number | null
          location: string | null
          media_type: string
          media_types: string[] | null
          media_urls: string[] | null
          post_type: string
          shares_count: number | null
          shield_enabled: boolean
          subcategory: string | null
          tagged_user_ids: string[]
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          views_count: number | null
          visibility: string
        }
        Insert: {
          allow_comments?: boolean
          allow_sharing?: boolean
          audience?: string
          bg_color?: string | null
          category: string
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          feeling?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_anonymous?: boolean
          is_private?: boolean
          likes_count?: number | null
          location?: string | null
          media_type?: string
          media_types?: string[] | null
          media_urls?: string[] | null
          post_type?: string
          shares_count?: number | null
          shield_enabled?: boolean
          subcategory?: string | null
          tagged_user_ids?: string[]
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          views_count?: number | null
          visibility?: string
        }
        Update: {
          allow_comments?: boolean
          allow_sharing?: boolean
          audience?: string
          bg_color?: string | null
          category?: string
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          feeling?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_anonymous?: boolean
          is_private?: boolean
          likes_count?: number | null
          location?: string | null
          media_type?: string
          media_types?: string[] | null
          media_urls?: string[] | null
          post_type?: string
          shares_count?: number | null
          shield_enabled?: boolean
          subcategory?: string | null
          tagged_user_ids?: string[]
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_stories: {
        Row: {
          audience: string
          comments_count: number
          content: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          is_deleted: boolean
          latitude: number | null
          likes_count: number
          location: string | null
          longitude: number | null
          moods: string[] | null
          photos: string[] | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string
          comments_count?: number
          content?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_deleted?: boolean
          latitude?: number | null
          likes_count?: number
          location?: string | null
          longitude?: number | null
          moods?: string[] | null
          photos?: string[] | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string
          comments_count?: number
          content?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_deleted?: boolean
          latitude?: number | null
          likes_count?: number
          location?: string | null
          longitude?: number | null
          moods?: string[] | null
          photos?: string[] | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_story_likes: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "travel_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_story_saves: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_story_saves_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "travel_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_group: string | null
          allow_messages_from: string | null
          avatar_url: string | null
          bio: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          detected_city: string | null
          contact_email: string | null
          contact_phone: string | null
          first_name: string | null
          favorite_actor_athlete_person: string | null
          favorite_club: string | null
          favorite_show_movie_song: string | null
          gender: string | null
          id: string
          is_private: boolean | null
          hobbies: string | null
          games: string | null
          last_name: string | null
          location: string | null
          name: string
          occupation: string | null
          primary_interest: string | null
          profile_visibility: Json | null
          school_name: string | null
          section_order: Json | null
          relationship: string | null
          timezone: string | null
          total_followers: number | null
          total_following: number | null
          total_posts: number | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          age_group?: string | null
          allow_messages_from?: string | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          detected_city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          first_name?: string | null
          favorite_actor_athlete_person?: string | null
          favorite_club?: string | null
          favorite_show_movie_song?: string | null
          gender?: string | null
          id: string
          is_private?: boolean | null
          hobbies?: string | null
          games?: string | null
          last_name?: string | null
          location?: string | null
          name: string
          occupation?: string | null
          primary_interest?: string | null
          profile_visibility?: Json | null
          school_name?: string | null
          section_order?: Json | null
          relationship?: string | null
          timezone?: string | null
          total_followers?: number | null
          total_following?: number | null
          total_posts?: number | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          age_group?: string | null
          allow_messages_from?: string | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          detected_city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          first_name?: string | null
          favorite_actor_athlete_person?: string | null
          favorite_club?: string | null
          favorite_show_movie_song?: string | null
          gender?: string | null
          id?: string
          is_private?: boolean | null
          hobbies?: string | null
          games?: string | null
          last_name?: string | null
          location?: string | null
          name?: string
          occupation?: string | null
          primary_interest?: string | null
          profile_visibility?: Json | null
          school_name?: string | null
          section_order?: Json | null
          relationship?: string | null
          timezone?: string | null
          total_followers?: number | null
          total_following?: number | null
          total_posts?: number | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      random_connect_memories: {
        Row: {
          created_at: string
          duration_seconds: number | null
          expires_at: string
          id: string
          mode: string
          partner_pseudo_name: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          mode: string
          partner_pseudo_name: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          mode?: string
          partner_pseudo_name?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "random_connect_memories_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "random_connect_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      random_connect_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_pseudo_name: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_pseudo_name: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_pseudo_name?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "random_connect_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "random_connect_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      random_connect_queue: {
        Row: {
          created_at: string
          id: string
          interests: string[] | null
          language: string | null
          mode: string
          pseudo_name: string
          region: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interests?: string[] | null
          language?: string | null
          mode: string
          pseudo_name: string
          region?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interests?: string[] | null
          language?: string | null
          mode?: string
          pseudo_name?: string
          region?: string | null
          user_id?: string
        }
        Relationships: []
      }
      random_connect_reconnect_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          receiver_id: string
          requester_id: string
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          receiver_id: string
          requester_id: string
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          receiver_id?: string
          requester_id?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "random_connect_reconnect_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "random_connect_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      random_connect_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "random_connect_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "random_connect_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      random_connect_sessions: {
        Row: {
          conversation_starter: string | null
          ended_at: string | null
          id: string
          mode: string
          started_at: string
          status: string
          user1_id: string
          user1_pseudo_name: string
          user2_id: string
          user2_pseudo_name: string
        }
        Insert: {
          conversation_starter?: string | null
          ended_at?: string | null
          id?: string
          mode: string
          started_at?: string
          status?: string
          user1_id: string
          user1_pseudo_name: string
          user2_id: string
          user2_pseudo_name: string
        }
        Update: {
          conversation_starter?: string | null
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          status?: string
          user1_id?: string
          user1_pseudo_name?: string
          user2_id?: string
          user2_pseudo_name?: string
        }
        Relationships: []
      }
      random_connect_text_memory: {
        Row: {
          content: string
          created_at: string
          id: string
          is_own_message: boolean
          session_index: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_own_message?: boolean
          session_index: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_own_message?: boolean
          session_index?: number
          user_id?: string
        }
        Relationships: []
      }
      random_connect_violations: {
        Row: {
          banned_until: string | null
          created_at: string
          id: string
          last_violation_at: string
          permanent_ban: boolean | null
          report_ban: boolean | null
          user_id: string
          violation_count: number
          violation_type: string
        }
        Insert: {
          banned_until?: string | null
          created_at?: string
          id?: string
          last_violation_at?: string
          permanent_ban?: boolean | null
          report_ban?: boolean | null
          user_id: string
          violation_count?: number
          violation_type: string
        }
        Update: {
          banned_until?: string | null
          created_at?: string
          id?: string
          last_violation_at?: string
          permanent_ban?: boolean | null
          report_ban?: boolean | null
          user_id?: string
          violation_count?: number
          violation_type?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          document_id: string
          id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      saved: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          media_type: string
          media_url: string
          user_id: string
          visibility: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          media_type: string
          media_url: string
          user_id: string
          visibility?: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          reaction: string | null
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          reaction?: string | null
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          reaction?: string | null
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          text: string
          user_id: string
          visibility: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          text: string
          user_id: string
          visibility?: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          text?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_loves: {
        Row: {
          created_at: string | null
          id: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_loves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          chat_user_id: string | null
          group_id: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_user_id?: string | null
          group_id?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_user_id?: string | null
          group_id?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          created_at: string | null
          id: string
          total_points: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          total_points?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          total_points?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      check_random_connect_ban: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_content: string
          p_link?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_mutual_friends_count: {
        Args: { user1: string; user2: string }
        Returns: number
      }
      get_random_connect_report_count: {
        Args: { check_user_id: string }
        Returns: number
      }
      is_blocked: {
        Args: { checker_id: string; target_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
