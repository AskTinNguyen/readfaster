import type { Passage } from './types';

export const PASSAGES: Passage[] = [
  {
    id: 'inside-the-agent-loop',
    title: 'Inside the Agent Loop',
    topic: 'AI agents',
    level: 'easy',
    text: `When people talk about an AI agent, they usually mean a language model that can do more than answer a single question. An agent can take actions, look at what happened, and decide what to do next. The idea sounds complicated, but the basic structure is surprisingly simple. It is a loop.

The loop starts with a goal. A person might ask the agent to fix a failing test, summarize a folder of reports, or book a meeting room. The model reads the request along with any instructions it has been given, and then it decides on a first step. Often that step is a tool call. A tool is just a function the agent is allowed to use, such as searching files, running a command, or reading a web page.

The model itself does not run the tool. It writes out a structured request, and a separate program, often called the harness, carries it out. The harness then takes the result, whether it is a list of files, an error message, or a page of text, and adds it to the conversation. Now the model can see what happened and choose its next move.

This cycle repeats: think, act, observe. A simple task might take two or three turns. A larger one might take dozens. At each step the model has only what is in its context, meaning the instructions, the conversation so far, and the results of earlier tool calls. It has no hidden memory of the files it looked at unless that information was placed back into the context.

Understanding the loop explains a lot about how agents behave. If an agent makes a wrong assumption early, it may build on that mistake for many steps, because each new step is based on what came before. If a tool returns a confusing error, the agent may try the same thing again or wander off in a new direction. And if the context fills up with long outputs, important details from the start of the task can get crowded out or summarized away.

It also explains why agent reports can be long. Each turn produces text, and at the end the agent usually writes a summary of what it did. That summary is the agent's own account of the work, not a guaranteed record of it. A careful reader treats the report as a helpful map, then checks the places that matter most, such as the actual changes made or the tests that were run.

None of this makes agents less useful. A loop that can search, act, and check its own results can finish real work. Knowing how the loop works simply helps you read its output with the right mix of trust and attention.`,
    questions: [
      {
        prompt: 'According to the passage, what is the basic structure of an AI agent?',
        options: [
          'A single long answer written in one pass',
          'A repeating loop of thinking, acting, and observing',
          'A private database of everything it has seen',
          'A fixed checklist of rules written by the user',
        ],
        answer: 1,
      },
      {
        prompt: 'When an agent requests a tool call, what actually carries it out?',
        options: [
          'The user, by copying and running the command',
          'The model, silently inside its own reasoning',
          'A separate program, often called the harness',
          'The web page or file that the tool is reading',
        ],
        answer: 2,
      },
      {
        prompt: 'Why can a wrong assumption early in a task cause lasting problems?',
        options: [
          'The harness refuses to run any later tool calls',
          'The model deletes its earlier context after each step',
          'Tools only return accurate results on the first turn',
          'Each new step is based on what came before it',
        ],
        answer: 3,
      },
      {
        prompt: "How does the passage suggest treating an agent's final summary?",
        options: [
          'As a helpful map whose most important claims should be checked',
          'As a complete and guaranteed record of all the work done',
          'As something to ignore entirely in favor of raw logs',
          'As proof that every test the agent mentions has passed',
        ],
        answer: 0,
      },
      {
        prompt: 'What can happen when the context fills up with long outputs?',
        options: [
          'The agent automatically switches to a faster model',
          'The user is required to restart the task from scratch',
          'Details from early in the task can be crowded out or summarized away',
          'The model gains a hidden memory of the files it opened',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'honeybee-waggle-dance',
    title: 'The Dance of the Honeybee',
    topic: 'Nature',
    level: 'easy',
    text: `A honeybee that finds a rich patch of flowers faces a problem. She has found food, but the rest of her colony has not, and bees cannot draw maps or point. The solution honeybees evolved is one of the most remarkable forms of communication in the animal world: a dance performed in the dark of the hive.

The dance was decoded by the Austrian scientist Karl von Frisch, who spent decades watching bees in glass-walled hives. He noticed that a returning forager would run in a straight line across the honeycomb while shaking her body from side to side, then loop back around and repeat the run, alternating left and right loops. He called this the waggle dance, and in 1973 his work earned him a share of the Nobel Prize in Physiology or Medicine.

Von Frisch found that the dance carries two key pieces of information. The first is direction. The honeycomb hangs vertically inside the hive, so the dancer uses straight up as a stand-in for the direction of the sun. If she waggles straight up the comb, the food lies toward the sun. If her waggle run points forty degrees to the right of vertical, the food lies forty degrees to the right of the sun's direction.

The second piece of information is distance. The longer the waggle portion of each run lasts, the farther away the food is. A run lasting a fraction of a second means the flowers are fairly close, while a run lasting several seconds can signal food more than a kilometer away. For food very near the hive, bees perform a simpler circling movement that gives less precise directions.

Other bees crowd around the dancer in the darkness, following her movements by touch and by the vibrations and sounds she makes. They also pick up the scent of the flowers on her body. Then they leave the hive and search in the direction and at the distance she indicated.

For many years some scientists doubted that bees really used this information, suggesting that recruits might simply follow scent. The question was largely settled in the early 2000s, when researchers attached tiny radar tags to bees and tracked their flights. Recruits that had followed a dance flew roughly the direction and distance it encoded, even when the researchers moved them to a different starting point before release.

The dance also adjusts over time. Because the sun moves across the sky during the day, dancing bees gradually shift the angle of their runs to keep their directions accurate. A tiny insect, in other words, is keeping track of time, angle, and distance at once, and sharing all of it with her sisters.`,
    questions: [
      {
        prompt: 'What does the angle of the waggle run, compared with straight up, tell other bees?',
        options: [
          'The type of flower the forager visited',
          'The amount of nectar available at the site',
          "The direction of the food relative to the sun's direction",
          'The time of day when the food was found',
        ],
        answer: 2,
      },
      {
        prompt: 'How does the dance communicate distance to the food?',
        options: [
          'Through how long the waggle portion of each run lasts',
          'Through the number of bees gathered around the dancer',
          'Through how loudly the dancer buzzes her wings',
          'Through the color of the pollen on her legs',
        ],
        answer: 0,
      },
      {
        prompt: 'Who decoded the meaning of the waggle dance?',
        options: [
          'An English beekeeper working in the 1800s',
          'A team of engineers using radar tags',
          'A group of chemists studying flower scent',
          'The Austrian scientist Karl von Frisch',
        ],
        answer: 3,
      },
      {
        prompt: 'What did the radar-tracking experiments show?',
        options: [
          'Recruits mostly followed scent and ignored the dance',
          'Recruits flew roughly the direction and distance the dance encoded',
          'Bees cannot find food when the sun is behind clouds',
          'Dances are only performed for food very close to the hive',
        ],
        answer: 1,
      },
      {
        prompt: 'Which statement best captures the main idea of the passage?',
        options: [
          'Bees depend almost entirely on scent to locate flowers',
          "The queen directs each forager to a specific food source",
          'Honeybees share the direction and distance of food through a dance',
          'Scientists still have no evidence that bees understand the dance',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'how-eyes-read',
    title: 'How Your Eyes Really Read',
    topic: 'Reading science',
    level: 'easy',
    text: `If you watch someone's eyes while they read, you might expect to see a smooth glide across each line. That is not what happens. In the late 1800s, the French eye doctor Louis Emile Javal and his colleagues observed that readers' eyes move in a series of quick jumps with brief pauses in between. The jumps are now called saccades, and the pauses are called fixations. Every reader does this, whether they are reading a novel, a news story, or an email.

A fixation is the moment when the eyes hold still and take in information. In skilled adult reading, a typical fixation lasts about a quarter of a second, though it can be shorter for easy, familiar words and longer for rare or difficult ones. A saccade is the jump from one fixation to the next. It is very fast, usually lasting only a few hundredths of a second, and in English it typically moves the eyes about seven to nine letters forward.

During a saccade, we take in essentially no useful information. The brain suppresses the blurry image created by the movement, which is why you never notice your own vision smearing as you read. In other words, nearly all reading happens during fixations.

How much can the eyes take in during one fixation? Less than many people think. Only a small central region of the retina, called the fovea, sees fine detail. Studies that change the text on a screen depending on where a reader is looking have shown that readers of English usually get useful information from about three or four letters to the left of the fixation point and around fourteen or fifteen letters to the right. Beyond that, letters are too blurry to identify reliably.

Readers do not fixate every word. Short, common, or predictable words such as "the" or "and" are often skipped, while long or unusual words may receive two fixations. Sometimes the eyes also jump backward to re-read something. These backward movements are called regressions, and they make up roughly ten to fifteen percent of saccades for skilled readers. Regressions are often described as a bad habit, but they usually happen for a reason: the reader has misread something or needs to check the meaning of a sentence.

Understanding these basic facts helps make sense of claims about reading speed. Since the eye can only see a limited span clearly, and since recognizing words takes time, there are real physical and mental limits on how fast anyone can read with full understanding.`,
    questions: [
      {
        prompt: 'What did Javal and his colleagues observe about reading?',
        options: [
          'The eyes glide smoothly and evenly along each line',
          'The eyes move in quick jumps separated by brief pauses',
          'Skilled readers take in a whole paragraph at once',
          'The eyes move backward more often than forward',
        ],
        answer: 1,
      },
      {
        prompt: 'During which part of eye movement do readers take in nearly all visual information?',
        options: [
          'During saccades, while the eyes are moving',
          'Only during regressions to earlier words',
          'During fixations, while the eyes are still',
          'In the jump between the end of one line and the next',
        ],
        answer: 2,
      },
      {
        prompt: 'For readers of English, how far to the right of the fixation point does useful information usually extend?',
        options: [
          'About three or four letters',
          'About seven to nine whole words',
          'Across the entire line of text',
          'About fourteen or fifteen letters',
        ],
        answer: 3,
      },
      {
        prompt: 'How does the passage characterize regressions?',
        options: [
          'Backward movements that usually happen for a reason, such as checking meaning',
          'A purely bad habit that serves no purpose for the reader',
          'Movements that only beginning or struggling readers make',
          'Forward jumps that skip over short, common words',
        ],
        answer: 0,
      },
      {
        prompt: 'Which words are most likely to be skipped by the eyes?',
        options: [
          'Long and unusual words',
          'Short, common, or predictable words',
          'Words at the start of each line',
          'Names of people and places',
        ],
        answer: 1,
      },
    ],
  },
  {
    id: 'reviewing-ai-code',
    title: 'Reviewing Code You Did Not Write',
    topic: 'AI agents',
    level: 'medium',
    text: `Code written by an AI agent has an unusual property: it almost always looks reasonable. Variable names are sensible, the formatting is clean, and comments explain what each part is meant to do. This polish is useful, but it also creates a trap for reviewers. Human-written code often signals its own weak spots through awkward naming or hesitant comments. Generated code tends to present everything with the same even confidence, whether a given line is correct or not.

Psychologists have a name for the tendency to trust automated systems too much: automation bias. It has been documented in aviation, medicine, and navigation, and it shows up in code review too. When a change arrives with a tidy summary saying that the feature is implemented and all tests pass, it is tempting to skim the diff and approve it. The summary, however, is the agent's description of its own work. It may be accurate, or it may describe what the agent intended rather than what it actually did.

A more reliable approach starts with the question the change was meant to answer. Before reading the code, restate the goal in your own words and decide what a correct solution must do, including the awkward cases: empty inputs, missing files, network failures, and unusual users. Then read the code looking for those cases, rather than letting the code lead you through its own happy path.

Tests deserve special attention. An agent asked to make tests pass may write tests that check very little, or adjust an existing test's expectations to match new behavior instead of fixing the behavior. A test that asserts a function returns something, without checking what, will pass almost anything. Reading the assertions carefully, and occasionally breaking the code on purpose to confirm that a test fails, is one of the fastest ways to find out whether the safety net is real.

Scope is another common problem. Agents sometimes change more than they were asked to, tidying unrelated files, renaming things, or adding features no one requested. Each extra change is something else that can break, and it makes the important part of the diff harder to see. A useful habit is to check the list of changed files before reading any single file closely, and to ask why each one was touched.

Finally, watch for confident references to things that may not exist. Language models can produce calls to library functions or configuration options that sound plausible but are not real, or that belong to a different version of a library. Running the code, or checking the documentation for any unfamiliar call, catches these quickly.

None of this means generated code is worse than human code. Often it is quite good. The point is that its surface quality is not evidence of correctness, so the reviewer has to supply the skepticism that the code itself does not display.`,
    questions: [
      {
        prompt: 'Why does the passage say AI-generated code creates a trap for reviewers?',
        options: [
          'It is usually formatted inconsistently and is hard to read',
          'It rarely includes comments explaining what it does',
          'Its uniformly confident polish does not reveal which parts are weak',
          'It is almost always much longer than equivalent human code',
        ],
        answer: 2,
      },
      {
        prompt: 'What is automation bias?',
        options: [
          'The tendency to trust automated systems too much',
          'A flaw in how language models format source code',
          'A preference among reviewers for manual testing',
          'A tendency of automated tools to reject human changes',
        ],
        answer: 0,
      },
      {
        prompt: 'What does the passage recommend doing before reading the code itself?',
        options: [
          "Reading the agent's summary closely to learn its intent",
          'Running the full test suite and checking that it passes',
          'Checking that the formatting matches the project style',
          'Restating the goal and deciding what a correct solution must handle',
        ],
        answer: 3,
      },
      {
        prompt: 'According to the passage, what is a fast way to check whether a test is meaningful?',
        options: [
          'Counting how many tests were added in the change',
          'Breaking the code on purpose and confirming the test fails',
          'Asking the agent to confirm that its tests are thorough',
          'Checking that the test suite runs in under a minute',
        ],
        answer: 1,
      },
      {
        prompt: 'What is the main conclusion of the passage?',
        options: [
          'Generated code is generally worse than human code and should be rewritten',
          "Reviewers can save time by relying on the agent's own summary",
          'Surface quality is not evidence of correctness, so reviewers must supply skepticism',
          'Only the tests matter, so the rest of the code need not be read',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'voice-inside-your-head',
    title: 'The Voice Inside Your Head',
    topic: 'Reading science',
    level: 'medium',
    text: `Many people notice that when they read silently, they seem to hear the words in their head. This inner voice is called subvocalization, or inner speech, and it has become a favorite target of speed-reading courses. The usual claim is that the inner voice limits you to the pace of speaking, so if you can switch it off, you can read several times faster. The research tells a more complicated story.

Scientists have studied subvocalization for more than a century. One method is to place sensors on the throat and lips to record tiny muscle movements during silent reading, a technique called electromyography. Studies in the 1960s and 1970s found that such activity is common and that it tends to increase when the text becomes more difficult. That pattern suggested that inner speech is not simply a leftover habit from learning to read aloud, but something readers lean on when they need to work harder.

A well-known experiment by Curtis Hardyck and Lewis Petrinovich tested what happens when the habit is suppressed. Using feedback that alerted students whenever their throat muscles became active, the researchers were able to reduce the muscle activity. But when they did, comprehension of difficult material got worse. Easy material was much less affected.

Other lines of research point in a similar direction. Working memory, the mental space where we hold information while we use it, appears to rely partly on a sound-based store, sometimes called the phonological loop. Holding the words of a sentence in this sound-based form may help readers keep the beginning of a long sentence available while they reach its end. Experiments that occupy this system, for example by asking people to repeat a meaningless syllable while reading, tend to hurt comprehension of complex sentences more than simple ones.

It is also important to be clear about what inner speech is not. Skilled readers do not pronounce each word at full speaking speed in their minds. Average silent reading is noticeably faster than typical speech, with estimates for adults commonly around two hundred to three hundred words per minute, compared with roughly one hundred fifty for conversation. So the inner voice is not a strict speed limit set by how fast you can talk.

A major 2016 review of reading research led by Keith Rayner concluded that there is little evidence that eliminating inner speech is possible, or that doing so would improve reading. The practical lesson is modest. If you notice yourself visibly mouthing words, that habit may be worth changing, but the quieter voice in your head is probably doing useful work, especially when the text is hard.`,
    questions: [
      {
        prompt: 'What is the usual speed-reading claim about subvocalization?',
        options: [
          'It limits reading to the pace of speech, so eliminating it would allow much faster reading',
          'It improves comprehension of easy text but not difficult text',
          'It occurs only in children who are still learning to read',
          'It is caused by poor eyesight and can be fixed with glasses',
        ],
        answer: 0,
      },
      {
        prompt: 'What did electromyography studies find about when subvocal muscle activity increases?',
        options: [
          'When the text becomes easier and more familiar',
          'When readers are tired at the end of the day',
          'When the text becomes more difficult',
          'Only when people read aloud to others',
        ],
        answer: 2,
      },
      {
        prompt: 'What did Hardyck and Petrinovich find when they reduced throat muscle activity?',
        options: [
          'Reading speed roughly doubled with no loss of understanding',
          'Feedback could not reduce the muscle activity at all',
          'Comprehension of easy material fell sharply',
          'Comprehension of difficult material got worse',
        ],
        answer: 3,
      },
      {
        prompt: 'Why does the passage say the inner voice is not a strict speed limit?',
        options: [
          'Most skilled readers have no inner voice at all',
          'Silent reading is typically faster than conversational speech',
          'Inner speech only happens when reading poetry',
          'People can speak faster than they can read silently',
        ],
        answer: 1,
      },
      {
        prompt: 'What did the 2016 review conclude about eliminating inner speech?',
        options: [
          'It is the single most important key to faster reading',
          'It can be achieved with a few weeks of feedback training',
          'There is little evidence it is possible or that it would help',
          'It matters only for people reading in a second language',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'shipping-container',
    title: 'The Box That Shrank the World',
    topic: 'Economics and history',
    level: 'medium',
    text: `For most of history, loading a ship was slow, expensive, and labor-intensive work. Cargo arrived at the docks in sacks, barrels, crates, and bales of every size. Teams of dockworkers, known as longshoremen, carried and stacked each item by hand or with small cranes, fitting pieces together in the hold like a giant puzzle. A cargo ship could spend as long in port being loaded and unloaded as it spent at sea, and theft and breakage were routine.

The change came from an unexpected direction. Malcom McLean was not a sailor but an American trucking entrepreneur who had grown frustrated watching his trucks wait for hours at ports. His idea was to skip the repacking altogether: put the goods in a large steel box once, and move the whole box from truck to ship to truck without opening it. In April 1956 a converted tanker called the Ideal X sailed from Newark, New Jersey, to Houston, Texas, carrying fifty-eight containers on its deck.

The savings were dramatic. By one widely cited estimate, the cost of loading loose cargo at the time was nearly six dollars per ton, while loading the Ideal X came to about sixteen cents per ton. Ships could now be loaded in hours instead of days, spend more of their time at sea, and carry goods with far less theft.

Success was not immediate. Different companies used boxes of different sizes, and a container built for one firm's ships and cranes might not fit another's. During the 1960s, industry groups and the International Organization for Standardization worked out common sizes and corner fittings. Standard boxes meant that any crane, ship, train, or truck built to the standard could handle any container, and that is what allowed a truly global system to form. Today, shipping capacity is still measured in twenty-foot equivalent units, based on the length of a standard box.

The effects spread far beyond the docks. Cheap, reliable shipping made it practical for companies to build products from parts made in many different countries, creating the long supply chains common today. Port cities changed too. Older piers in crowded city centers, such as those in Manhattan and London, declined, while large new container terminals were built where there was room for cranes and stacks of boxes. The number of dockworkers fell sharply, and in many ports this led to long and bitter labor disputes.

The container is a reminder that transformative technology is not always complicated. A steel box is simple. What made it powerful was the system around it: agreed standards, specialized ships and cranes, and a new way of thinking about moving goods from door to door rather than from port to port.`,
    questions: [
      {
        prompt: "What was Malcom McLean's background before containers?",
        options: [
          'He was a merchant ship captain',
          'He designed cranes for major ports',
          'He was an American trucking entrepreneur',
          "He led a dockworkers' union in New Jersey",
        ],
        answer: 2,
      },
      {
        prompt: "What was McLean's core idea?",
        options: [
          'Building larger and faster cargo ships',
          'Packing goods into a box once and moving the box between trucks and ships unopened',
          'Paying dockworkers by the ton instead of by the hour',
          'Replacing coastal shipping with long-distance rail lines',
        ],
        answer: 1,
      },
      {
        prompt: 'Why was standardization in the 1960s so important?',
        options: [
          'It let any compliant crane, ship, train, or truck handle any container',
          'It allowed each shipping company to keep its own box size',
          'It made containers cheaper to paint and repair',
          'It reduced the number of ports a ship had to visit',
        ],
        answer: 0,
      },
      {
        prompt: 'According to the estimate in the passage, about how much did loading the Ideal X cost?',
        options: [
          'Nearly six dollars per ton',
          'About sixteen dollars per ton',
          'About fifty-eight cents per ton',
          'About sixteen cents per ton',
        ],
        answer: 3,
      },
      {
        prompt: 'What is the main lesson the passage draws from the container?',
        options: [
          'The most important technologies are always the most complex',
          'A simple box became powerful because of the system of standards and equipment around it',
          'Shipping costs have changed very little since the 1950s',
          'Dockworkers broadly welcomed containers because they created jobs',
        ],
        answer: 1,
      },
    ],
  },
  {
    id: 'moving-continents',
    title: 'The Slow Acceptance of Moving Continents',
    topic: 'Earth science',
    level: 'medium',
    text: `Look at a world map and you may notice that the eastern coast of South America and the western coast of Africa seem to fit together like puzzle pieces. People had commented on this since maps became accurate enough to show it. But it was the German scientist Alfred Wegener who, beginning in 1912, built the idea into a serious scientific theory. He proposed that the continents had once been joined in a single great landmass, which he called Pangaea, and had slowly drifted apart.

Wegener gathered evidence from many fields. Fossils of the same ancient plants and animals, including a small reptile called Mesosaurus, turned up on continents now separated by wide oceans. Distinctive rock formations and mountain belts seemed to continue from one continent to another when the pieces were fitted back together. And there were signs of ancient glaciers in places that are now hot, such as parts of India and Africa, as well as coal deposits, formed from lush vegetation, in places that are now cold.

Despite this, most geologists rejected his idea for decades. The main objection was not the evidence of past connections but the lack of a convincing mechanism. Wegener could not explain what force could push enormous continents through the solid rock of the ocean floor, and the forces he suggested were shown to be far too weak. Many scientists preferred other explanations, such as land bridges that had later sunk beneath the sea. Wegener died in 1930 during an expedition on the Greenland ice sheet, long before his central idea was vindicated.

The turning point came from the ocean floor itself. After the Second World War, new technology allowed scientists to map the seabed in detail. Marie Tharp, working with Bruce Heezen, helped reveal a vast mountain range running down the middle of the Atlantic, with a rift valley along its crest. In the early 1960s, Harry Hess proposed that new ocean floor forms at these ridges and spreads outward. Soon afterward, researchers discovered that the rocks on either side of the ridges carry matching stripes of magnetic orientation, recording periodic reversals of Earth's magnetic field as new crust formed and moved away.

By the late 1960s, these findings had been combined into the theory of plate tectonics. Earth's outer shell is broken into large plates that move a few centimeters each year, roughly as fast as fingernails grow. Continents do not plow through the sea floor, as Wegener imagined; they ride along on moving plates.

Wegener's story is often told as one of a lone genius ignored by stubborn experts. The fuller lesson is subtler. His critics were right that he lacked a workable mechanism, and he was right that the continents had moved. It took new kinds of evidence to show how both could be true.`,
    questions: [
      {
        prompt: 'What did Wegener propose?',
        options: [
          'The continents were once joined and have slowly drifted apart',
          'The ocean floor is the oldest rock on Earth',
          'Land bridges once connected the continents and later sank',
          'Mountain ranges form only from volcanic eruptions',
        ],
        answer: 0,
      },
      {
        prompt: "What was the main reason most geologists rejected Wegener's idea?",
        options: [
          'Fossil evidence directly contradicted his theory',
          'He had no evidence from rock formations',
          'His maps of the coastlines were inaccurate',
          'He could not provide a convincing mechanism for moving continents',
        ],
        answer: 3,
      },
      {
        prompt: 'What kind of evidence eventually changed scientific opinion?',
        options: [
          'New Mesosaurus fossils discovered in Greenland',
          'Satellite photographs taken in the 1930s',
          'Mapping of the ocean floor, including mid-ocean ridges and magnetic stripes',
          "Measurements recovered from Wegener's final expedition",
        ],
        answer: 2,
      },
      {
        prompt: 'According to plate tectonics, how do continents move?',
        options: [
          'By plowing through the solid rock of the ocean floor',
          'By riding on plates that move a few centimeters per year',
          'By floating freely on the surface of the oceans',
          'Only in sudden jumps during major earthquakes',
        ],
        answer: 1,
      },
      {
        prompt: "What does the passage present as the fuller lesson of Wegener's story?",
        options: [
          'Experts will always resist new ideas regardless of evidence',
          'Wegener was mistaken about nearly everything he proposed',
          'His critics were right about the mechanism, he was right about movement, and new evidence reconciled both',
          'A theory should be accepted as soon as it is clearly proposed',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'designing-context',
    title: 'What the Model Can See',
    topic: 'Prompt and context design',
    level: 'hard',
    text: `A language model's behavior at any given moment depends on a single thing it can examine: its context window, the span of text it receives as input. Everything the model is expected to use, including instructions, examples, retrieved documents, conversation history, and the output of earlier tool calls, must be represented there. Nothing outside the window exists for the model at that moment. This simple fact reframes much of what is loosely called prompt engineering. The central question is less about finding magic phrasing and more about deciding what information to place in front of the model, in what form, and in what order.

Early advice focused on the wording of individual requests, and wording does matter. Explicit statements of the goal, the audience, and the constraints tend to outperform vague requests, because they remove guesswork the model would otherwise resolve with generic defaults. Well-chosen examples can be even more powerful, since models readily imitate the format and level of detail they are shown. That power cuts both ways: an unrepresentative example can anchor the output more strongly than an instruction that contradicts it.

As models began operating as agents, the problem shifted from composing a prompt to managing a context that grows throughout a task. Every file read and every command output accumulates. Windows have become large, but capacity is not the same as effective use. A study first released in 2023 under the title Lost in the Middle reported that several models used information placed at the beginning or end of a long input more reliably than information buried in the middle. Later models have narrowed this gap considerably, and results vary by task, so the finding is better treated as a caution than as a fixed law. Still, the underlying concern persists: irrelevant material is not free. It costs time and money to process and can distract from what matters.

Practitioners have therefore developed techniques that treat context as a scarce resource to be curated. Retrieval systems select only the passages most relevant to a query rather than loading an entire knowledge base. Long tool outputs can be truncated or summarized before being returned. Agents working on extended tasks may periodically compact their history, replacing a long transcript with a condensed record of decisions and open questions, or write notes to external files that can be reloaded later. Some systems delegate subtasks to separate agent instances, each with a fresh, focused context, and receive back only a short report.

Each of these techniques involves a trade-off. Summarization discards detail, and the detail it discards may turn out to be the one that mattered. Retrieval can miss relevant passages that do not closely match the query. Delegation saves space but hides the reasoning behind a subagent's conclusions. For people who read agent output, this has a practical consequence: a confident final report may rest on a compressed or partial view of the evidence. Knowing how the context was assembled is part of knowing how much to trust what came out of it.`,
    questions: [
      {
        prompt: 'How does the passage reframe prompt engineering?',
        options: [
          'As mainly a search for special phrasing that unlocks better answers',
          'As a practice that only matters for small, older models',
          'As deciding what information to put in the context, in what form and order',
          'As something made unnecessary by very large context windows',
        ],
        answer: 2,
      },
      {
        prompt: 'What risk does the passage associate with examples in a prompt?',
        options: [
          'Models tend to ignore examples when instructions are present',
          'An unrepresentative example can anchor the output more strongly than a contradicting instruction',
          'Examples always reduce accuracy on unfamiliar tasks',
          'Examples only work when they are placed at the very end',
        ],
        answer: 1,
      },
      {
        prompt: 'How does the passage suggest treating the Lost in the Middle finding?',
        options: [
          'As a fixed law that applies equally to every model',
          'As proof that long context windows are useless in practice',
          'As a result that was later retracted by its authors',
          'As a caution, since later models narrowed the gap and results vary by task',
        ],
        answer: 3,
      },
      {
        prompt: 'What does compacting an agent\'s history involve, according to the passage?',
        options: [
          'Replacing a long transcript with a condensed record of decisions and open questions',
          'Permanently deleting all tool outputs from the task',
          'Splitting the model itself into several smaller models',
          'Loading the entire knowledge base into the window at once',
        ],
        answer: 0,
      },
      {
        prompt: 'What practical consequence does the passage draw for people reading agent output?',
        options: [
          'Reports from delegated subagents are more reliable than direct work',
          'Longer reports reliably indicate more careful work',
          'A confident report may rest on a compressed or partial view of the evidence',
          'Summaries can be trusted because they preserve every relevant detail',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'speed-reading-evidence',
    title: 'Speed Reading: Promise and Evidence',
    topic: 'Reading science',
    level: 'hard',
    text: `The modern speed-reading industry is usually traced to Evelyn Wood, a Utah schoolteacher who in 1959 launched a course called Reading Dynamics. Wood reported that she had observed exceptionally fast readers and that their technique could be taught, in part by using a hand to guide the eyes down the page. Graduates were said to read thousands of words per minute with good comprehension, and the course became famous, promoted by celebrities and taken by politicians and business leaders. Many later programs, from books to software, have repeated similar promises.

Researchers have long been skeptical, and the reasons are grounded in what is known about the mechanics of reading. Eye-tracking studies show that readers must fixate words to identify them reliably, because only a small region of the visual field provides sharp detail. Each fixation takes time, and so does the mental work of recognizing words and integrating them into sentences. Estimates of typical silent reading speed for adults fall around two hundred to three hundred words per minute. Rates several times higher are achievable, but studies have repeatedly found that comprehension falls as speed rises. When trained speed readers have been tested against ordinary readers, they have generally done reasonably well on the gist of a text but poorly on specific details, performing much like people who were simply told to skim.

A comprehensive review published in 2016 by Keith Rayner and colleagues reached a sober conclusion. There is a trade-off between speed and accuracy in reading, and no training method has been shown to overcome it. The most reliable route to faster reading with good comprehension is to become a more skilled language user, particularly by expanding vocabulary and general knowledge, which make individual words and ideas faster to process.

Technology has produced newer variations. Rapid serial visual presentation, or RSVP, displays words one at a time at a fixed point on a screen, removing the need to move the eyes at all. Commercial apps built on this idea have advertised dramatic speed gains. The technique does remove some of the physical cost of eye movements, but it also removes the reader's ability to regress, that is, to glance back at earlier words. Experiments that prevented regressions found that comprehension suffered, especially for sentences that are easy to misread on the first pass. Studies of RSVP have also found that comprehension declines at high presentation rates, just as it does in ordinary reading.

None of this means reading speed cannot improve. Practice can help people read more fluently, reduce unnecessary re-reading caused by lapses in attention, and become skilled at choosing when to skim and when to read closely. Those are real and useful gains. The honest message, supported by current evidence, is that speed is a dial rather than a trick: turning it up usually costs comprehension, and the skill lies in knowing how far to turn it for a given purpose.`,
    questions: [
      {
        prompt: 'How did trained speed readers perform when tested against ordinary readers?',
        options: [
          'They outperformed ordinary readers on both gist and details',
          'They could not answer any comprehension questions at all',
          'They matched careful readers at every speed tested',
          'They did reasonably on gist but poorly on details, much like skimmers',
        ],
        answer: 3,
      },
      {
        prompt: 'What did the 2016 review by Rayner and colleagues conclude?',
        options: [
          'There is a speed-accuracy trade-off that no training method has been shown to overcome',
          'Using a hand to guide the eyes reliably triples reading speed',
          'RSVP apps eliminate the trade-off between speed and comprehension',
          'Vocabulary and background knowledge have little effect on reading speed',
        ],
        answer: 0,
      },
      {
        prompt: 'According to the review, what is the most reliable route to faster reading with good comprehension?',
        options: [
          'Training the eyes to make fewer fixations per line',
          'Using a hand or pointer as a pacer on every page',
          'Becoming a more skilled language user, especially through vocabulary and knowledge',
          'Reading exclusively with rapid serial visual presentation',
        ],
        answer: 2,
      },
      {
        prompt: 'What drawback of RSVP does the passage highlight?',
        options: [
          'It requires more eye movements than ordinary reading',
          'It prevents regressions, and preventing regressions hurt comprehension',
          'It can only display short words of a few letters',
          'It cannot present text faster than two hundred words per minute',
        ],
        answer: 1,
      },
      {
        prompt: 'What is the overall message of the passage?',
        options: [
          'Speed reading is a complete fraud and practice never helps',
          'Courses can reliably deliver thousands of words per minute with full comprehension',
          'Speed is a dial: turning it up usually costs comprehension, so the skill is choosing the setting',
          'Eye-tracking research is too unreliable to support any conclusions',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'governing-the-commons',
    title: 'Governing the Commons',
    topic: 'Economics',
    level: 'hard',
    text: `In 1968 the ecologist Garrett Hardin published an essay in the journal Science titled The Tragedy of the Commons. Hardin asked readers to picture a pasture open to all herders. Each herder gains the full benefit of adding one more animal, while the cost of overgrazing is shared among everyone. Following this logic, each person rationally adds animals until the pasture is ruined. Hardin concluded that shared resources would be destroyed unless access was restricted, typically through government control or division into private property.

The argument was elegant and enormously influential, shaping policy debates about fisheries, forests, groundwater, and the atmosphere. Yet the political scientist Elinor Ostrom noticed that it did not match what she and others found when they studied real communities. Across the world, groups of people had managed shared resources for generations, sometimes for centuries, without either privatizing them or handing them to a central authority. Farmers in the Swiss village of Torbel had governed common alpine meadows and forests through local rules for hundreds of years. Irrigation communities in Spain had allocated scarce water through shared institutions, including water courts with roots in the medieval period. Similar arrangements existed among Japanese villages managing mountain forests and among fishing communities in many countries.

Ostrom did not claim that commons never fail; many do. Her contribution, set out in her 1990 book Governing the Commons, was to ask what distinguished the long-lasting successes from the failures. She identified a set of recurring features, which she called design principles. Successful groups had clear boundaries defining who could use the resource. Their rules fitted local conditions rather than being imposed from a distance. The people affected by the rules could take part in changing them. Users, or people accountable to them, monitored behavior. Penalties for rule-breaking were graduated, starting small for a first offense rather than being severe from the outset. Cheap and accessible ways existed to resolve disputes, and outside authorities recognized the community's right to organize itself.

The key insight was that Hardin's herders were imagined as isolated individuals who could not communicate or make binding agreements. Real people talk, build trust, watch one another, and create institutions. Where those conditions hold, the tragedy is not inevitable. Where they are missing, for instance when users are numerous, anonymous, or able to leave easily, the resource is far more vulnerable.

In 2009 Ostrom became the first woman to receive the Nobel Memorial Prize in Economic Sciences, sharing it with Oliver Williamson. Her work did not replace markets or governments as tools for managing resources, but it widened the range of options. It also carried a methodological lesson: a persuasive abstract model should be tested against careful observation of how people actually behave.`,
    questions: [
      {
        prompt: "What was the core logic of Hardin's tragedy of the commons?",
        options: [
          'Herders naturally cooperate to protect a shared pasture',
          'Each user gains the full benefit of extra use while the cost is shared, so the resource is overused',
          'Private ownership of land always leads to overgrazing',
          'Government control of pastures inevitably destroys them',
        ],
        answer: 1,
      },
      {
        prompt: "What did Ostrom observe that challenged Hardin's conclusion?",
        options: [
          'Shared resources essentially never fail when left alone',
          'All successful commons were run by national governments',
          "Hardin's original essay relied on fabricated data",
          'Many communities managed shared resources for long periods without privatization or central control',
        ],
        answer: 3,
      },
      {
        prompt: "Which of the following is one of Ostrom's design principles?",
        options: [
          'Severe penalties from the very first offense',
          'Rules imposed by authorities far from the resource',
          'Graduated sanctions that start small',
          'Open, unlimited access for anyone who wishes to use the resource',
        ],
        answer: 2,
      },
      {
        prompt: "Which assumption in Hardin's model did Ostrom's work most directly challenge?",
        options: [
          'That users are isolated individuals unable to communicate or make agreements',
          'That natural resources are effectively infinite',
          'That grazing animals eat more as they grow older',
          'That the pasture was already privately owned',
        ],
        answer: 0,
      },
      {
        prompt: "What methodological lesson does the passage draw from Ostrom's work?",
        options: [
          'Markets are always the best tool for managing resources',
          'A persuasive abstract model should be tested against observation of actual behavior',
          'Case studies of individual communities are too unreliable to use',
          'Governments should take direct control of all shared resources',
        ],
        answer: 1,
      },
    ],
  },
];
