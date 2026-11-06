export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chapters: {
        Row: {
          course_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          id?: string
          position: number
          title: string
        }
        Update: {
          course_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access: string
          category: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          level: string | null
          rating_average: number | null
          rating_count: number
          slug: string
          subtitle: string | null
          title: string
          tutor_id: string
        }
        Insert: {
          access?: string
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          rating_average?: number | null
          rating_count?: number
          slug: string
          subtitle?: string | null
          title: string
          tutor_id: string
        }
        Update: {
          access?: string
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          rating_average?: number | null
          rating_count?: number
          slug?: string
          subtitle?: string | null
          title?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_answers: {
        Row: {
          audio_seconds: number
          clarity: number
          created_at: string
          improvements: string[]
          input_tokens: number | null
          model: string
          model_answer: string
          output_tokens: number | null
          position: number
          relevance: number
          score: number
          session_id: string
          strengths: string[]
          structure: number
          transcript: string
          verdict: string
        }
        Insert: {
          audio_seconds: number
          clarity: number
          created_at?: string
          improvements?: string[]
          input_tokens?: number | null
          model: string
          model_answer: string
          output_tokens?: number | null
          position: number
          relevance: number
          score: number
          session_id: string
          strengths?: string[]
          structure: number
          transcript: string
          verdict: string
        }
        Update: {
          audio_seconds?: number
          clarity?: number
          created_at?: string
          improvements?: string[]
          input_tokens?: number | null
          model?: string
          model_answer?: string
          output_tokens?: number | null
          position?: number
          relevance?: number
          score?: number
          session_id?: string
          strengths?: string[]
          structure?: number
          transcript?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_answers_session_id_position_fkey"
            columns: ["session_id", "position"]
            isOneToOne: true
            referencedRelation: "interview_session_questions"
            referencedColumns: ["session_id", "position"]
          },
        ]
      }
      interview_feedback_reports: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          position: number | null
          reason: string
          session_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          position?: number | null
          reason: string
          session_id: string
          user_id?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          position?: number | null
          reason?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_feedback_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_feedback_reports_session_id_position_fkey"
            columns: ["session_id", "position"]
            isOneToOne: false
            referencedRelation: "interview_answers"
            referencedColumns: ["session_id", "position"]
          },
          {
            foreignKeyName: "interview_feedback_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          active: boolean
          category: string
          id: string
          key: string
          key_points: string[]
          kind: string
          prompt: string
          settings: string[]
        }
        Insert: {
          active?: boolean
          category: string
          id?: string
          key: string
          key_points: string[]
          kind: string
          prompt: string
          settings?: string[]
        }
        Update: {
          active?: boolean
          category?: string
          id?: string
          key?: string
          key_points?: string[]
          kind?: string
          prompt?: string
          settings?: string[]
        }
        Relationships: []
      }
      interview_session_questions: {
        Row: {
          category: string | null
          key_points: string[]
          kind: string
          position: number
          prompt: string
          question_id: string | null
          session_id: string
          tries: number
        }
        Insert: {
          category?: string | null
          key_points?: string[]
          kind: string
          position: number
          prompt: string
          question_id?: string | null
          session_id: string
          tries?: number
        }
        Update: {
          category?: string | null
          key_points?: string[]
          kind?: string
          position?: number
          prompt?: string
          question_id?: string | null
          session_id?: string
          tries?: number
        }
        Relationships: [
          {
            foreignKeyName: "interview_session_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_session_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          finished_at: string | null
          id: string
          input_tokens: number | null
          mode: string
          next_steps: string[]
          output_tokens: number | null
          readiness: number | null
          role: string | null
          started_at: string
          summary: string | null
          summary_model: string | null
          target: string | null
          top_strengths: string[]
          total_questions: number
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          input_tokens?: number | null
          mode: string
          next_steps?: string[]
          output_tokens?: number | null
          readiness?: number | null
          role?: string | null
          started_at?: string
          summary?: string | null
          summary_model?: string | null
          target?: string | null
          top_strengths?: string[]
          total_questions: number
          user_id?: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          input_tokens?: number | null
          mode?: string
          next_steps?: string[]
          output_tokens?: number | null
          readiness?: number | null
          role?: string | null
          started_at?: string
          summary?: string | null
          summary_model?: string | null
          target?: string | null
          top_strengths?: string[]
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_contents: {
        Row: {
          body: string | null
          lesson_id: string
          video_key: string | null
          video_url: string | null
        }
        Insert: {
          body?: string | null
          lesson_id: string
          video_key?: string | null
          video_url?: string | null
        }
        Update: {
          body?: string | null
          lesson_id?: string
          video_key?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_contents_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          user_id?: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          credit: string | null
          file_name: string
          id: string
          lesson_id: string
          mime_type: string
          position: number
          size_bytes: number
          storage_key: string
          title: string
        }
        Insert: {
          created_at?: string
          credit?: string | null
          file_name: string
          id?: string
          lesson_id: string
          mime_type: string
          position: number
          size_bytes: number
          storage_key: string
          title: string
        }
        Update: {
          created_at?: string
          credit?: string | null
          file_name?: string
          id?: string
          lesson_id?: string
          mime_type?: string
          position?: number
          size_bytes?: number
          storage_key?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_sources: {
        Row: {
          attribution_note: string | null
          author: string
          id: string
          lesson_id: string
          licence: string
          licence_url: string
          position: number
          role: string
          title: string
          url: string
        }
        Insert: {
          attribution_note?: string | null
          author: string
          id?: string
          lesson_id: string
          licence: string
          licence_url: string
          position: number
          role?: string
          title: string
          url: string
        }
        Update: {
          attribution_note?: string | null
          author?: string
          id?: string
          lesson_id?: string
          licence?: string
          licence_url?: string
          position?: number
          role?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_sources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          chapter_id: string
          duration_seconds: number
          id: string
          is_preview: boolean
          position: number
          title: string
        }
        Insert: {
          chapter_id: string
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          position: number
          title: string
        }
        Update: {
          chapter_id?: string
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_entitlements: {
        Row: {
          expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_consent_at: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          interests: string[]
          onboarding_completed_at: string | null
          onboarding_goal: string | null
          updated_at: string
        }
        Insert: {
          ai_consent_at?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          interests?: string[]
          onboarding_completed_at?: string | null
          onboarding_goal?: string | null
          updated_at?: string
        }
        Update: {
          ai_consent_at?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          interests?: string[]
          onboarding_completed_at?: string | null
          onboarding_goal?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_flags: {
        Row: {
          created_at: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          question_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_flags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          id: string
          is_correct: boolean
          position: number
          question_id: string
          text: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          position: number
          question_id: string
          text: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempt_answers: {
        Row: {
          answer_id: string | null
          answered_at: string
          attempt_id: string
          correct_answer_id: string
          is_correct: boolean
          question_id: string
        }
        Insert: {
          answer_id?: string | null
          answered_at?: string
          attempt_id: string
          correct_answer_id: string
          is_correct: boolean
          question_id: string
        }
        Update: {
          answer_id?: string | null
          answered_at?: string
          attempt_id?: string
          correct_answer_id?: string
          is_correct?: boolean
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempt_answers_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "quiz_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_correct_answer_id_fkey"
            columns: ["correct_answer_id"]
            isOneToOne: false
            referencedRelation: "quiz_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempt_questions: {
        Row: {
          attempt_id: string
          position: number
          question_id: string
        }
        Insert: {
          attempt_id: string
          position: number
          question_id: string
        }
        Update: {
          attempt_id?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempt_questions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          correct_count: number
          finished_at: string | null
          id: string
          quiz_id: string
          skipped_count: number
          started_at: string
          timed: boolean
          total_questions: number
          user_id: string
          wrong_count: number
        }
        Insert: {
          correct_count?: number
          finished_at?: string | null
          id?: string
          quiz_id: string
          skipped_count?: number
          started_at?: string
          timed?: boolean
          total_questions: number
          user_id?: string
          wrong_count?: number
        }
        Update: {
          correct_count?: number
          finished_at?: string | null
          id?: string
          quiz_id?: string
          skipped_count?: number
          started_at?: string
          timed?: boolean
          total_questions?: number
          user_id?: string
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          explanation: string | null
          id: string
          position: number
          prompt: string
          quiz_id: string
          reference_url: string | null
        }
        Insert: {
          explanation?: string | null
          id?: string
          position: number
          prompt: string
          quiz_id: string
          reference_url?: string | null
        }
        Update: {
          explanation?: string | null
          id?: string
          position?: number
          prompt?: string
          quiz_id?: string
          reference_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          chapter_id: string
          id: string
          is_preview: boolean
          position: number
          title: string
        }
        Insert: {
          chapter_id: string
          id?: string
          is_preview?: boolean
          position?: number
          title: string
        }
        Update: {
          chapter_id?: string
          id?: string
          is_preview?: boolean
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_follows: {
        Row: {
          created_at: string
          tutor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          tutor_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          tutor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_follows_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          headline: string | null
          id: string
          name: string
          profile_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          name: string
          profile_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          name?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      viva_answers: {
        Row: {
          accuracy: number
          audio_seconds: number
          clarity: number
          created_at: string
          improvements: string[]
          input_tokens: number | null
          model: string
          model_answer: string
          output_tokens: number | null
          question_id: string
          reasoning: number
          score: number
          session_id: string
          strengths: string[]
          transcript: string
          verdict: string
        }
        Insert: {
          accuracy: number
          audio_seconds: number
          clarity: number
          created_at?: string
          improvements?: string[]
          input_tokens?: number | null
          model: string
          model_answer: string
          output_tokens?: number | null
          question_id: string
          reasoning: number
          score: number
          session_id: string
          strengths?: string[]
          transcript: string
          verdict: string
        }
        Update: {
          accuracy?: number
          audio_seconds?: number
          clarity?: number
          created_at?: string
          improvements?: string[]
          input_tokens?: number | null
          model?: string
          model_answer?: string
          output_tokens?: number | null
          question_id?: string
          reasoning?: number
          score?: number
          session_id?: string
          strengths?: string[]
          transcript?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "viva_answers_session_id_question_id_fkey"
            columns: ["session_id", "question_id"]
            isOneToOne: true
            referencedRelation: "viva_session_questions"
            referencedColumns: ["session_id", "question_id"]
          },
        ]
      }
      viva_feedback_reports: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          question_id: string
          reason: string
          session_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id: string
          reason: string
          session_id: string
          user_id?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id?: string
          reason?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viva_feedback_reports_session_id_question_id_fkey"
            columns: ["session_id", "question_id"]
            isOneToOne: false
            referencedRelation: "viva_answers"
            referencedColumns: ["session_id", "question_id"]
          },
          {
            foreignKeyName: "viva_feedback_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      viva_session_questions: {
        Row: {
          position: number
          question_id: string
          reason: string
          session_id: string
          tries: number
        }
        Insert: {
          position: number
          question_id: string
          reason: string
          session_id: string
          tries?: number
        }
        Update: {
          position?: number
          question_id?: string
          reason?: string
          session_id?: string
          tries?: number
        }
        Relationships: [
          {
            foreignKeyName: "viva_session_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viva_session_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "viva_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      viva_sessions: {
        Row: {
          attempt_id: string
          finished_at: string | null
          id: string
          started_at: string
          total_questions: number
          user_id: string
        }
        Insert: {
          attempt_id: string
          finished_at?: string | null
          id?: string
          started_at?: string
          total_questions: number
          user_id?: string
        }
        Update: {
          attempt_id?: string
          finished_at?: string | null
          id?: string
          started_at?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viva_sessions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viva_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_chapter: {
        Args: { p_course_id: string; p_title: string }
        Returns: string
      }
      add_lesson: {
        Args: { p_chapter_id: string; p_title: string }
        Returns: string
      }
      add_lesson_resource: {
        Args: {
          p_file_name: string
          p_key: string
          p_lesson_id: string
          p_mime_type: string
          p_size_bytes: number
          p_title: string
        }
        Returns: string
      }
      answer_quiz_question: {
        Args: {
          p_answer_id?: string
          p_attempt_id: string
          p_question_id: string
        }
        Returns: {
          correct_answer_id: string
          explanation: string
          is_correct: boolean
        }[]
      }
      can_edit_lesson: { Args: { p_lesson_id: string }; Returns: boolean }
      course_student_count: { Args: { p_course_id: string }; Returns: number }
      create_course: {
        Args: {
          p_access: string
          p_category: string
          p_description: string
          p_level: string
          p_subtitle: string
          p_title: string
        }
        Returns: string
      }
      create_general_interview: {
        Args: { p_questions: Json; p_role: string; p_user_id: string }
        Returns: {
          finished_at: string | null
          id: string
          input_tokens: number | null
          mode: string
          next_steps: string[]
          output_tokens: number | null
          readiness: number | null
          role: string | null
          started_at: string
          summary: string | null
          summary_model: string | null
          target: string | null
          top_strengths: string[]
          total_questions: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "interview_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_chapter: { Args: { p_chapter_id: string }; Returns: undefined }
      delete_lesson: { Args: { p_lesson_id: string }; Returns: undefined }
      delete_lesson_resource: {
        Args: { p_resource_id: string }
        Returns: string
      }
      finish_quiz_attempt: {
        Args: { p_attempt_id: string }
        Returns: {
          correct_count: number
          finished_at: string | null
          id: string
          quiz_id: string
          skipped_count: number
          started_at: string
          timed: boolean
          total_questions: number
          user_id: string
          wrong_count: number
        }
        SetofOptions: {
          from: "*"
          to: "quiz_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finish_viva_session: {
        Args: { p_session_id: string }
        Returns: {
          attempt_id: string
          finished_at: string | null
          id: string
          started_at: string
          total_questions: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "viva_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      give_ai_consent: { Args: never; Returns: undefined }
      interview_sessions_left: { Args: never; Returns: number }
      move_chapter: {
        Args: { p_chapter_id: string; p_direction: number }
        Returns: undefined
      }
      move_lesson: {
        Args: { p_direction: number; p_lesson_id: string }
        Returns: undefined
      }
      quiz_sessions_left: { Args: never; Returns: number }
      remove_lesson_video: { Args: { p_lesson_id: string }; Returns: string }
      rename_chapter: {
        Args: { p_chapter_id: string; p_title: string }
        Returns: undefined
      }
      set_course_published: {
        Args: { p_course_id: string; p_published: boolean }
        Returns: undefined
      }
      set_lesson_video: {
        Args: { p_duration_seconds: number; p_key: string; p_lesson_id: string }
        Returns: string
      }
      start_interview_session: {
        Args: { p_target: string }
        Returns: {
          finished_at: string | null
          id: string
          input_tokens: number | null
          mode: string
          next_steps: string[]
          output_tokens: number | null
          readiness: number | null
          role: string | null
          started_at: string
          summary: string | null
          summary_model: string | null
          target: string | null
          top_strengths: string[]
          total_questions: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "interview_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_quiz_attempt: {
        Args: {
          p_question_count?: number
          p_quiz_id: string
          p_timed?: boolean
        }
        Returns: {
          correct_count: number
          finished_at: string | null
          id: string
          quiz_id: string
          skipped_count: number
          started_at: string
          timed: boolean
          total_questions: number
          user_id: string
          wrong_count: number
        }
        SetofOptions: {
          from: "*"
          to: "quiz_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_viva_session: {
        Args: { p_attempt_id: string }
        Returns: {
          attempt_id: string
          finished_at: string | null
          id: string
          started_at: string
          total_questions: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "viva_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_course: {
        Args: {
          p_access: string
          p_category: string
          p_course_id: string
          p_description: string
          p_level: string
          p_subtitle: string
          p_title: string
        }
        Returns: undefined
      }
      update_lesson: {
        Args: {
          p_body: string
          p_is_preview: boolean
          p_lesson_id: string
          p_title: string
        }
        Returns: undefined
      }
      viva_sessions_left: { Args: never; Returns: number }
      withdraw_ai_consent: { Args: never; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
