/*
  ============================================================
  EVERYTHING PERSONAL LIVES IN THIS FILE.
  Change the words between the quotes, save, refresh the page.
  You never need to touch index.html, style.css or main.js.
  ============================================================
*/

window.US = {
  // ---- The two of you -------------------------------------
  you: "Tashal",
  her: "Sam",

  // The moment it all started (year-month-day, 24h time).
  // The live counter at the top counts up from here.
  together: "2025-11-01T19:00:00",

  // Shown under your names on the first card.
  firstPlace: "T.A.N Coffee",

  // The browser tab title.
  title: "Me & My Wife",

  // ---- The facts row --------------------------------------
  // Short value + one line of explanation. Keep values short.
  facts: [
    { value: "1 Nov 2025", note: "Our first date" },
    { value: "T.A.N Coffee", note: "Where it all started" },
    { value: "Boston Pizza", note: "Then the parking lot, still talking" },
    { value: "Concrete", note: "Our child. Adopted and very loved" },
  ],

  intro: {
    heading: "One year already, how time flies",
    note:
      "You tapped a little tag and ended up here. This page is ours: the photos, the moments, and a few things I never say often enough.",
  },

  // ---- Photos ---------------------------------------------
  // Put your pictures in the /photos folder and list them here.
  // Square or portrait photos look best (they're cropped to 4:5).
  photos: [
    // One photo:   src: "photos/x.jpg"
    // Several:     src: ["photos/x-1.jpg", "photos/x-2.jpg"]  (tap to flip; the first is the cover)
    // No photo:    leave src out and write a note instead
    { note: "No photos. We were too busy talking.", caption: "Our first date", date: "Nov 2025", place: "T.A.N & BP" },
    { src: ["photos/charcuterie-1.jpg", "photos/charcuterie-2.jpg"], caption: "Charcuterie night, the first of many", date: "Nov 2025", place: "Your room in Tower" },
    { src: ["photos/christmas-1.jpg", "photos/christmas-2.jpg"], caption: "Christmas", date: "Dec 2025", place: "Water polo" },
    { src: ["photos/valentines-1.jpg", "photos/valentines-2.jpg"], caption: "Valentine's Day", date: "Feb 2026", place: "Candlelight concert, Halifax" },
    { src: ["photos/oysters-1.jpg", "photos/oysters-2.jpg"], caption: "Oysters galore", date: "Apr 2026", place: "Shuck" },
    { src: ["photos/birthday-1.jpg", "photos/birthday-2.jpg", "photos/birthday-3.jpg"], caption: "Your birthday", date: "Jun 2026", place: "Troy & 606" },
    { src: ["photos/moving-in-1.jpg", "photos/moving-in-2.jpg", "photos/moving-in-3.jpg", "photos/moving-in-4.jpg"], caption: "Moving in together", date: "Jul 2026", place: "Home" },
    { src: ["photos/kitty-1.jpg", "photos/kitty-2.jpg", "photos/kitty-3.jpg"], caption: "Bringing Kitty home", date: "Aug 2026", place: "Her forever home" },
  ],

  // ---- Our story (the cards you scroll through) -----------
  story: [
    { date: "1 Nov 2025", title: "The first hello", text: "From the drive down Main Street to the County Fair Mall parking lot, I was nervous, excited, and I didn't want to stop talking." },
    { date: "Nov 2025", title: "Our first ride to Halifax", text: "The music was good, the company was even better, and we had the best time once we got there." },
    { date: "Nov 2025", title: "I love you", text: "Okay, I kind of made you say it. I knew what you were going to say, and I wanted to say it too. I was just too nervous to go first." },
    { date: "Dec 2025", title: "Our first Airbnb", text: "The door refused to open and we nearly froze, but I loved every second of it with you." },
    { date: "Jul 2026", title: "Moving in together", text: "We were basically living together already. This time, we made it official." },
    { date: "Today", title: "Still you", text: "One whole year. We've done so much together, and I can't wait for so many more." },
  ],

  // ---- Reasons (tap to draw another) ----------------------
  reasons: [
    "You make me smile every single day.",
    "You hold my hand in the car without even thinking about it.",
    "You're always cold, and somehow I've learned to love the cold.",
    "You make the small things matter.",
    "Doing nothing with you is still my favourite thing to do.",
    "You're down for whatever, whenever.",
    "Every song is better when we're singing it together.",
    "Movie nights with you are the best nights.",
    "We talk like two crazy people, and it makes perfect sense to us.",
    "I can tell you anything.",
    "You accept me exactly as I am.",
    "You believe in me more than I believe in myself.",
    "You feel like home, wherever we are.",
    "You're the most beautiful girl I've ever met.",
  ],

  // ---- The letter -----------------------------------------
  // One string per paragraph.
  letter: [
    "Dear Sam,",
    "One year ago, a crazy man dressed as a femboy Joker told me I had a date. Little did I know it would be the start of the best part of my life.",
    "Thank you for everything you do for me: for making me laugh, for making me smile, and for loving me every single day.",
    "I don't always say it the way I want to, so I'm putting it here, somewhere you can come back to whenever you like: I love you, and I'm so glad it's you.",
    "Here's to every year after this one.",
  ],
  signOff: "Love, Tashal",
  // The tear-off coupon at the bottom of the letter.
  coupon: "Good for one dinner of your choosing. No expiry.",

  // ---- The back of the card (footer) ----------------------
  footer: {
    signOff: "Always yours",
    message: "Tap the tag whenever you miss me. This page will always be here.",
    // Each line can be plain text, or { text, href } to make it a link.
    lines: [
      "Our first date: 1 Nov 2025",
      "Next stop: wherever you want",
    ],
    stamp: "photos/birthday-1.jpg",
  },

  // ---- Music ---------------------------------------------
  // Put your song in the /music folder as an .mp3 and name it below.
  // It starts on her first tap anywhere on the page (browsers don't allow
  // sound before a tap), loops, and the button bottom-right pauses it.
  // To turn music off, delete the src line.
  music: {
    src: "music/our-song.mp3",
    volume: 0.6,      // 0 to 1
    autoplay: true,   // false = only plays when she presses the button
  },

  // ---- Optional lock --------------------------------------
  // A gentle "secret question" before the page opens. It keeps
  // casual visitors out, but it is NOT real security (see README).
  // To turn it on: set enabled to true, write a question only she
  // can answer, and paste the hash of the answer (see README).
  lock: {
    enabled: false,
    question: "Where was our first date?",
    // SHA-256 of the lower-case answer. This one is for "main street".
    answerHash: "112e4f69d4cc2efda5c41524234a9cfcc486983b0b08ec32c90b824b20779079",
  },
};
