-- DayByDay: Achievement Definitions Seed
INSERT INTO achievements (key, title, description, icon, category, threshold) VALUES
  -- Streak achievements
  ('streak_3',       '3-Day Streak',         'Completed habits 3 days in a row',            'flame',   'streak',  3),
  ('streak_7',       '7-Day Streak',          'One full week of consistency',                 'flame',   'streak',  7),
  ('streak_14',      '2-Week Streak',         'Two weeks of daily dedication',                'flame',   'streak',  14),
  ('streak_30',      '30-Day Streak',         'A full month of habits',                       'flame',   'streak',  30),
  ('streak_60',      '60-Day Streak',         'Two months of unwavering commitment',          'flame',   'streak',  60),
  ('streak_100',     '100-Day Streak',        'One hundred days — remarkable',                'trophy',  'streak',  100),
  -- Completion milestones
  ('sessions_10',    'Getting Started',       'Completed 10 habit sessions',                  'star',    'milestone', 10),
  ('sessions_50',    'Building Momentum',     'Completed 50 habit sessions',                  'star',    'milestone', 50),
  ('sessions_100',   'Century Club',          'Completed 100 habit sessions',                 'trophy',  'milestone', 100),
  ('sessions_500',   'Habit Master',          'Completed 500 habit sessions',                 'trophy',  'milestone', 500),
  -- Weekly achievements
  ('perfect_week',   'Perfect Week',          'Completed all scheduled habits in a week',     'check-circle', 'weekly', 7),
  ('consistent_week','Consistent Week',       'Completed 80%+ of habits in a week',           'check',   'weekly', NULL),
  -- Personal growth
  ('first_habit',    'First Step',            'Created your first habit',                     'plus-circle', 'onboarding', 1),
  ('five_habits',    'Building a System',     'Created 5 habits',                             'list',    'onboarding', 5),
  ('improved_week',  'Improving',             'Improved consistency week over week',           'trending-up', 'growth', NULL);
