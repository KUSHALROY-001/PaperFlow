-- Builds on top of 002_extraction_templates.sql / 004_extraction_templates_hardening.sql
-- (both already applied). Does not change the column's type (still JSONB
-- array, same CHECK (jsonb_typeof(sections) = 'array') as before) - only
-- the shape of each ELEMENT changes, from a bare topic-name string
-- ("Physics") to a structured object:
--
--   { "name": string, "topics": string[],
--     "questionCount"?: number, "marksPerCorrect"?: number,
--     "negativeMarksPerWrong"?: number }
--
-- questionCount/marksPerCorrect/negativeMarksPerWrong are OMITTED (not
-- set to a guessed value) wherever the real exam doesn't publish a fixed,
-- stable per-section split - inventing false precision there would be
-- worse than leaving it to the mock test's own top-level defaults. IBPS
-- PO Prelims is the one exception below: its 30/35/35 sectional split is
-- long-standing and well-published, so that one carries real per-section
-- questionCount.
--
-- Keyed by slug rather than id - safe to run whether extraction_templates
-- already has the seeded rows (from 002) or, in a workspace-scoped copy
-- of this table, doesn't (WHERE slug = '...' simply matches nothing then,
-- not an error).

UPDATE extraction_templates SET sections = '[
  {"name": "Engineering Mathematics", "topics": ["Discrete Mathematics", "Linear Algebra", "Calculus", "Probability and Statistics"]},
  {"name": "Digital Logic", "topics": ["Boolean Algebra", "Combinational Circuits", "Sequential Circuits", "Number Representation", "Computer Arithmetic"]},
  {"name": "Computer Organization", "topics": ["Machine Instructions and Addressing Modes", "ALU and Datapath", "Memory Hierarchy: Cache and Main Memory", "I/O Interface"]},
  {"name": "Programming & DS", "topics": ["Programming in C", "Recursion", "Arrays, Stacks and Queues", "Linked Lists", "Trees", "Graphs", "Hashing"]},
  {"name": "Algorithms", "topics": ["Asymptotic Analysis", "Searching and Sorting", "Divide and Conquer", "Greedy Algorithms", "Dynamic Programming", "Graph Algorithms"]},
  {"name": "Theory of Computation", "topics": ["Regular Languages and Finite Automata", "Context-Free Languages and Push-Down Automata", "Turing Machines", "Undecidability"]},
  {"name": "OS", "topics": ["Processes and Threads", "CPU Scheduling", "Deadlocks", "Memory Management and Virtual Memory", "File Systems"]},
  {"name": "DBMS", "topics": ["ER Model", "Relational Model and Relational Algebra", "SQL", "Normalization", "Transactions and Concurrency Control", "Indexing"]},
  {"name": "Networks", "topics": ["OSI and TCP/IP Layers", "Routing Algorithms", "Flow and Congestion Control", "Network Security Basics", "Application Layer Protocols"]}
]'::jsonb
WHERE slug = 'gate-cs';

UPDATE extraction_templates SET sections = '[
  {"name": "Mathematics", "topics": ["Algebra", "Set Theory", "Coordinate Geometry", "Trigonometry", "Calculus", "Probability and Statistics"]},
  {"name": "Analytical Ability", "topics": ["Logical Reasoning", "Series Completion", "Puzzles", "Data Interpretation", "Syllogisms"]},
  {"name": "Computer Awareness", "topics": ["Computer Fundamentals", "Number Systems", "Programming Basics", "Operating Systems", "Data Structures Basics"]}
]'::jsonb
WHERE slug = 'jeca-entrance';

UPDATE extraction_templates SET sections = '[
  {"name": "Physics", "topics": ["Mechanics", "Thermodynamics", "Electrostatics and Current Electricity", "Magnetism and EMI", "Optics", "Modern Physics"]},
  {"name": "Chemistry", "topics": ["Physical Chemistry", "Organic Chemistry", "Inorganic Chemistry"]},
  {"name": "Mathematics", "topics": ["Algebra", "Calculus", "Coordinate Geometry", "Trigonometry", "Vectors and 3D Geometry", "Probability and Statistics"]}
]'::jsonb
WHERE slug = 'jee-mains';

UPDATE extraction_templates SET sections = '[
  {"name": "History", "topics": ["Ancient India", "Medieval India", "Modern India and Freedom Struggle", "Art and Culture"]},
  {"name": "Geography", "topics": ["Physical Geography", "Indian Geography", "World Geography"]},
  {"name": "Polity", "topics": ["Indian Constitution", "Governance", "Panchayati Raj", "Rights Issues"]},
  {"name": "Economics", "topics": ["Indian Economy", "Economic Development", "Government Budgeting"]},
  {"name": "Science & Tech", "topics": ["General Science", "IT and Space", "Biotechnology", "Current Developments"]},
  {"name": "Environment", "topics": ["Ecology", "Biodiversity", "Climate Change", "Environmental Policy"]}
]'::jsonb
WHERE slug = 'upsc-prelims';

-- The one seed where a fixed, long-published sectional split genuinely
-- exists (30/35/35 = 100), hence questionCount is set here and nowhere
-- else in this migration.
UPDATE extraction_templates SET sections = '[
  {"name": "English Language", "questionCount": 30, "topics": ["Reading Comprehension", "Cloze Test", "Error Spotting", "Sentence Improvement", "Fill in the Blanks", "Para Jumbles"]},
  {"name": "Quantitative Aptitude", "questionCount": 35, "topics": ["Simplification", "Number Series", "Data Interpretation", "Quadratic Equations", "Averages and Percentages", "Profit and Loss"]},
  {"name": "Reasoning Ability", "questionCount": 35, "topics": ["Puzzles and Seating Arrangement", "Syllogism", "Inequalities", "Blood Relations", "Direction Sense", "Coding-Decoding"]}
]'::jsonb
WHERE slug = 'bank-po-ibps';

UPDATE extraction_templates SET sections = '[
  {"name": "Physics", "topics": ["Light: Reflection and Refraction", "The Human Eye and the Colourful World", "Electricity", "Magnetic Effects of Electric Current"]},
  {"name": "Chemistry", "topics": ["Chemical Reactions and Equations", "Acids, Bases and Salts", "Metals and Non-metals", "Carbon and its Compounds"]},
  {"name": "Biology", "topics": ["Life Processes", "Control and Coordination", "Reproduction", "Heredity and Evolution", "Our Environment"]}
]'::jsonb
WHERE slug = 'class-10-science';

-- Deliberately generic - "Quick Quiz" and "Subject Notes Extractor" are
-- not tied to any real exam's syllabus, so an empty topics list is
-- correct here, not a placeholder to fill in later.
UPDATE extraction_templates SET sections = '[
  {"name": "Mixed Topics", "topics": []}
]'::jsonb
WHERE slug = 'quick-quiz-20q';

UPDATE extraction_templates SET sections = '[
  {"name": "Key Concepts", "topics": []},
  {"name": "Definitions", "topics": []},
  {"name": "Formulas", "topics": []}
]'::jsonb
WHERE slug = 'subject-notes-extractor';
