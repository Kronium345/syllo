-- Sample catalogue for development (prompts/04-supabase.md): 3 tutors, 6 published
-- courses, their chapters and lessons, and lesson content. Ids are derived from readable
-- keys with md5(), so this file can run again without duplicating rows.
-- Covers and avatars are remote placeholder images; videos are Google's public samples.

insert into public.tutors (id, name, headline, bio, avatar_url) values
  (md5('tutor:maya')::uuid, 'Maya Okafor', 'Mobile engineer & teacher',
   'Maya has shipped React Native apps for startups and banks, and has taught over 20,000 developers.',
   'https://picsum.photos/seed/syllo-tutor-maya/200/200'),
  (md5('tutor:leo')::uuid, 'Leo Martins', 'Product designer',
   'Leo designs interfaces people enjoy using, and runs design workshops for product teams.',
   'https://picsum.photos/seed/syllo-tutor-leo/200/200'),
  (md5('tutor:aisha')::uuid, 'Aisha Rahman', 'Data scientist',
   'Aisha turns messy data into clear decisions, and loves teaching Python from the very first line.',
   'https://picsum.photos/seed/syllo-tutor-aisha/200/200')
on conflict (id) do nothing;

insert into public.courses (id, slug, title, subtitle, description, cover_image_url, category, level, tutor_id, is_published) values
  (md5('course:react-native-basics')::uuid, 'react-native-basics', 'React Native Basics',
   'Build your first mobile app with Expo',
   'Learn components, styling, navigation and data by building a real app you can run on your phone.',
   'https://picsum.photos/seed/syllo-react-native-basics/800/450', 'Development', 'beginner', md5('tutor:maya')::uuid, true),
  (md5('course:ui-design-fundamentals')::uuid, 'ui-design-fundamentals', 'UI Design Fundamentals',
   'Layout, type and colour that just work',
   'A practical introduction to the rules behind clean, usable interfaces, with exercises after every chapter.',
   'https://picsum.photos/seed/syllo-ui-design-fundamentals/800/450', 'Design', 'beginner', md5('tutor:leo')::uuid, true),
  (md5('course:python-for-everyone')::uuid, 'python-for-everyone', 'Python for Everyone',
   'Programming from zero, one idea at a time',
   'Variables, loops, functions and files explained slowly and clearly, with small projects to practise.',
   'https://picsum.photos/seed/syllo-python-for-everyone/800/450', 'Development', 'beginner', md5('tutor:aisha')::uuid, true),
  (md5('course:data-analysis-pandas')::uuid, 'data-analysis-pandas', 'Data Analysis with pandas',
   'Clean, explore and chart real datasets',
   'Load data, fix it, ask it questions and present the answers, using pandas and simple charts.',
   'https://picsum.photos/seed/syllo-data-analysis-pandas/800/450', 'Data', 'intermediate', md5('tutor:aisha')::uuid, true),
  (md5('course:advanced-animations')::uuid, 'advanced-animations', 'Advanced Mobile Animations',
   'Gestures and motion with Reanimated',
   'Make interfaces feel alive: springs, gestures, shared transitions and performance on real devices.',
   'https://picsum.photos/seed/syllo-advanced-animations/800/450', 'Development', 'advanced', md5('tutor:maya')::uuid, true),
  (md5('course:design-systems')::uuid, 'design-systems', 'Design Systems in Practice',
   'Tokens, components and documentation',
   'Build a small design system from scratch and learn how teams keep it consistent as products grow.',
   'https://picsum.photos/seed/syllo-design-systems/800/450', 'Design', 'intermediate', md5('tutor:leo')::uuid, true)
on conflict (id) do nothing;

-- Chapters: (course slug, position, title).
insert into public.chapters (id, course_id, position, title)
select md5('chapter:' || slug || ':' || position)::uuid, md5('course:' || slug)::uuid, position, title
from (values
  ('react-native-basics', 1, 'Getting started'),
  ('react-native-basics', 2, 'Components and styling'),
  ('react-native-basics', 3, 'Navigation and data'),
  ('ui-design-fundamentals', 1, 'Seeing like a designer'),
  ('ui-design-fundamentals', 2, 'Typography and colour'),
  ('ui-design-fundamentals', 3, 'Layout and spacing'),
  ('python-for-everyone', 1, 'Your first program'),
  ('python-for-everyone', 2, 'Making decisions'),
  ('python-for-everyone', 3, 'Functions and files'),
  ('data-analysis-pandas', 1, 'Loading data'),
  ('data-analysis-pandas', 2, 'Cleaning and shaping'),
  ('data-analysis-pandas', 3, 'Asking questions'),
  ('data-analysis-pandas', 4, 'Telling the story'),
  ('advanced-animations', 1, 'Motion principles'),
  ('advanced-animations', 2, 'Gestures'),
  ('advanced-animations', 3, 'Performance'),
  ('design-systems', 1, 'Foundations'),
  ('design-systems', 2, 'Components'),
  ('design-systems', 3, 'Running the system')
) as c(slug, position, title)
on conflict (id) do nothing;

-- Lessons: (course slug, chapter position, lesson position, title, minutes). The first
-- lesson of every course is a free preview.
insert into public.lessons (id, chapter_id, position, title, duration_seconds, is_preview)
select
  md5('lesson:' || slug || ':' || chapter || ':' || position)::uuid,
  md5('chapter:' || slug || ':' || chapter)::uuid,
  position,
  title,
  minutes * 60,
  chapter = 1 and position = 1
from (values
  ('react-native-basics', 1, 1, 'Welcome to the course', 3),
  ('react-native-basics', 1, 2, 'Setting up Expo', 8),
  ('react-native-basics', 1, 3, 'Running on your phone', 6),
  ('react-native-basics', 2, 1, 'Views, text and images', 12),
  ('react-native-basics', 2, 2, 'Styling with flexbox', 15),
  ('react-native-basics', 2, 3, 'Lists that scroll', 11),
  ('react-native-basics', 2, 4, 'Handling touches', 9),
  ('react-native-basics', 3, 1, 'Screens and routes', 14),
  ('react-native-basics', 3, 2, 'Passing data between screens', 10),
  ('react-native-basics', 3, 3, 'Fetching from an API', 16),
  ('ui-design-fundamentals', 1, 1, 'What makes a good interface', 5),
  ('ui-design-fundamentals', 1, 2, 'Hierarchy and focus', 9),
  ('ui-design-fundamentals', 1, 3, 'Learning from great apps', 7),
  ('ui-design-fundamentals', 2, 1, 'Choosing a typeface', 10),
  ('ui-design-fundamentals', 2, 2, 'A simple type scale', 8),
  ('ui-design-fundamentals', 2, 3, 'Colour with purpose', 12),
  ('ui-design-fundamentals', 3, 1, 'Grids without the pain', 11),
  ('ui-design-fundamentals', 3, 2, 'Spacing systems', 9),
  ('ui-design-fundamentals', 3, 3, 'Designing a real screen', 18),
  ('python-for-everyone', 1, 1, 'Why Python?', 4),
  ('python-for-everyone', 1, 2, 'Installing Python', 7),
  ('python-for-everyone', 1, 3, 'Hello, world', 6),
  ('python-for-everyone', 1, 4, 'Variables and types', 12),
  ('python-for-everyone', 2, 1, 'If, elif and else', 10),
  ('python-for-everyone', 2, 2, 'Loops', 13),
  ('python-for-everyone', 2, 3, 'Lists and dictionaries', 15),
  ('python-for-everyone', 3, 1, 'Writing functions', 12),
  ('python-for-everyone', 3, 2, 'Reading and writing files', 11),
  ('python-for-everyone', 3, 3, 'Project: a tiny journal', 20),
  ('data-analysis-pandas', 1, 1, 'Meet pandas', 5),
  ('data-analysis-pandas', 1, 2, 'Reading CSV files', 9),
  ('data-analysis-pandas', 1, 3, 'Exploring a DataFrame', 12),
  ('data-analysis-pandas', 2, 1, 'Missing values', 11),
  ('data-analysis-pandas', 2, 2, 'Fixing types and dates', 10),
  ('data-analysis-pandas', 2, 3, 'Reshaping data', 14),
  ('data-analysis-pandas', 3, 1, 'Filtering and sorting', 9),
  ('data-analysis-pandas', 3, 2, 'Grouping and aggregating', 15),
  ('data-analysis-pandas', 3, 3, 'Joining datasets', 13),
  ('data-analysis-pandas', 4, 1, 'Charts that explain', 12),
  ('data-analysis-pandas', 4, 2, 'Project: city bike trips', 22),
  ('advanced-animations', 1, 1, 'Why motion matters', 6),
  ('advanced-animations', 1, 2, 'Springs vs timing', 12),
  ('advanced-animations', 1, 3, 'The UI thread', 14),
  ('advanced-animations', 2, 1, 'Pan and fling', 16),
  ('advanced-animations', 2, 2, 'Bottom sheets from scratch', 20),
  ('advanced-animations', 2, 3, 'Shared element transitions', 18),
  ('advanced-animations', 3, 1, 'Measuring frame drops', 11),
  ('advanced-animations', 3, 2, 'Avoiding re-renders', 13),
  ('advanced-animations', 3, 3, 'Testing on real devices', 9),
  ('design-systems', 1, 1, 'What a design system is', 6),
  ('design-systems', 1, 2, 'Design tokens', 12),
  ('design-systems', 1, 3, 'Naming things', 9),
  ('design-systems', 2, 1, 'Buttons, the hard way', 14),
  ('design-systems', 2, 2, 'Inputs and states', 13),
  ('design-systems', 2, 3, 'Composing components', 11),
  ('design-systems', 3, 1, 'Documentation people read', 10),
  ('design-systems', 3, 2, 'Versioning and change', 9),
  ('design-systems', 3, 3, 'Measuring adoption', 8)
) as l(slug, chapter, position, title, minutes)
on conflict (id) do nothing;

-- Content for every lesson: a sample video (cycled) and a short markdown body.
insert into public.lesson_contents (lesson_id, video_url, body)
select
  l.id,
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/' ||
    (array['BigBuckBunny', 'ElephantsDream', 'ForBiggerBlazes', 'ForBiggerEscapes', 'ForBiggerFun',
           'ForBiggerJoyrides', 'ForBiggerMeltdowns', 'Sintel', 'TearsOfSteel'])
    [1 + (row_number() over (order by c.slug, ch.position, l.position) - 1)::int % 9] || '.mp4',
  '## ' || l.title || E'\n\n' ||
    'In this lesson of **' || c.title || '** you will work through *' || l.title || '* step by step.' ||
    E'\n\n- Watch the video once all the way through\n- Try the idea yourself\n- Come back to the key points below\n\n' ||
    '### Key points' || E'\n\n' ||
    '1. What ' || lower(l.title) || ' is and when to use it' || E'\n' ||
    '2. A worked example' || E'\n' ||
    '3. Common mistakes to avoid'
from public.lessons l
join public.chapters ch on ch.id = l.chapter_id
join public.courses c on c.id = ch.course_id
on conflict (lesson_id) do nothing;
