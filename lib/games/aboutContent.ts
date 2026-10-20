// Everything About Us: one question, four answers. Each of you picks what's true for you, then guesses what the other picked.
// Card positions are stored in games, so only add to the end of a list; never reorder or delete mid-list.

export interface AboutQ { q: string; opts: string[] }

type Row = [string, string, string, string, string];
const rows = (list: Row[]): AboutQ[] => list.map(([q, ...opts]) => ({ q, opts }));

const FOOD: Row[] = [
  ["Your ultimate comfort food?", "Pizza", "Biryani or rice", "Pasta or noodles", "Burger or fries"],
  ["Pick a breakfast.", "Eggs and toast", "Pancakes or waffles", "Parathas or poha", "Just coffee"],
  ["Your go-to dessert?", "Ice cream", "Chocolate anything", "Cake", "Something traditional"],
  ["Hot drink of choice?", "Chai", "Coffee", "Hot chocolate", "I'm a cold drink person"],
  ["Spice level?", "Mild please", "Medium", "Hot", "Bring the fire"],
  ["Street food or fine dining?", "Street food, always", "A cosy café", "Fine dining", "Home cooked beats both"],
  ["Pick a cuisine for tonight.", "Indian", "Italian", "Chinese or Thai", "Mexican or Middle Eastern"],
  ["How do you like your meals?", "Cooked together", "Ordered in", "One of us cooks", "Eating out"],
  ["Best snack?", "Chips", "Fruit", "Nuts or popcorn", "Something sweet"],
  ["Pick a pizza topping.", "Plain cheese", "Veggies", "Chicken or meat", "Pineapple (yes, really)"],
  ["Sweet or salty?", "Sweet", "Salty", "Both together", "Neither, I'm full"],
  ["Your cold drink?", "Soda", "Fresh juice", "Iced tea or coffee", "Plain water"],
  ["The food you'd eat every week?", "Rice dishes", "Bread and wraps", "Noodles", "Sandwiches"],
  ["How often do you eat out?", "Almost never", "Once in a while", "Every week", "Most days"],
  ["Pick a late-night craving.", "Instant noodles", "Fries", "Ice cream", "Leftovers"],
  ["Your ideal brunch?", "Avocado toast", "Big fry-up", "Sweet pastries", "Skip it, go to lunch"],
  ["Pick a sauce.", "Ketchup", "Mayo", "Chilli sauce", "Mustard or pesto"],
  ["Which would you give up forever?", "Cheese", "Chocolate", "Chai or coffee", "Fried food"],
  ["Your food adventure level?", "I like what I know", "Mostly familiar", "I try new things", "Weirder the better"],
  ["Your kitchen skills?", "Master chef", "Pretty decent", "Beginner", "Can burn water"],
];

const LIFESTYLE: Row[] = [
  ["Morning person or night owl?", "Early bird", "Somewhere in between", "Night owl", "Depends on the day"],
  ["A perfect weekend morning?", "Sleeping in", "A long walk or workout", "A slow breakfast out", "Chores and errands"],
  ["How do you recharge?", "Alone time", "With you", "With friends", "Out and about"],
  ["Your ideal Friday night?", "Movie at home", "A dinner out", "A party or club", "Gaming or a hobby"],
  ["How tidy are you?", "Spotless", "Mostly tidy", "Organised chaos", "What mess?"],
  ["Your exercise style?", "Gym", "Running or walking", "Yoga or home workouts", "Sports with friends"],
  ["How do you spend money?", "Save first", "Balanced", "Treat myself often", "Experiences over things"],
  ["Pick a pet.", "Dog", "Cat", "Something unusual", "None, thanks"],
  ["Your phone habit?", "Always on it", "Checks it often", "Only when needed", "Leaves it behind"],
  ["How early do you reach places?", "Early", "On time", "A little late", "Fashionably late"],
  ["Where would you live?", "A big city", "A small town", "Near the sea", "Near the hills"],
  ["Your sleep schedule?", "Strict", "Fairly regular", "All over the place", "Naps count"],
  ["Plans or spontaneous?", "Plan everything", "Plan the main bits", "Mostly go with the flow", "No plans, ever"],
  ["Pick a hobby.", "Reading", "Cooking or baking", "Music or art", "Gaming or sports"],
  ["How do you like your home?", "Minimal", "Cosy and full", "Plants everywhere", "Bright and modern"],
  ["How do you handle stress?", "Talk it out", "Go quiet", "Keep busy", "Sleep it off"],
  ["Shopping style?", "Online", "In person", "Only when needed", "Window shopping, mostly"],
  ["Pick a cleaning job you'd dodge.", "Dishes", "Laundry", "Bathrooms", "All of them"],
  ["Your idea of a lazy Sunday?", "Bed and series", "Cooking something slow", "A long drive", "Meeting friends"],
  ["What matters most in a home?", "Space", "Location", "Privacy", "Natural light"],
];

const VIBES: Row[] = [
  ["Favourite colour family?", "Blues", "Reds and pinks", "Greens", "Neutrals and black"],
  ["Beach or mountains?", "Beach", "Mountains", "Both, equally", "Neither, a city"],
  ["Club or café?", "Club", "Café", "A quiet bar", "Home"],
  ["Pick a season.", "Summer", "Monsoon or spring", "Autumn", "Winter"],
  ["Sunrise or sunset?", "Sunrise", "Sunset", "Both", "Stars"],
  ["Which would you rather have?", "A big party", "A small dinner", "A night in", "A road trip"],
  ["Pick a time of day.", "Early morning", "Afternoon", "Evening", "Late night"],
  ["Your style is mostly?", "Casual", "Smart", "Sporty", "Bold and colourful"],
  ["Pick a weather.", "Sunny", "Rainy", "Snowy", "Cloudy and breezy"],
  ["Which feels most like you?", "Calm", "Energetic", "Dreamy", "Practical"],
  ["Cats or dogs?", "Dogs", "Cats", "Both", "Neither"],
  ["Pick a gift to receive.", "Something handmade", "Something useful", "An experience", "Something to eat"],
  ["Your dream setting?", "A cabin in the woods", "A villa by the sea", "A penthouse", "A farmhouse"],
  ["Best sound?", "Rain", "Waves", "Music", "Silence"],
  ["Pick a scent.", "Fresh flowers", "Coffee", "Ocean air", "Vanilla"],
  ["Which is you at a party?", "Centre of it", "Chatting in a corner", "At the snack table", "Leaving early"],
  ["Pick a superpower.", "Fly", "Read minds", "Pause time", "Teleport"],
  ["Your perfect temperature?", "Cold, with a blanket", "Cool", "Warm", "Hot"],
  ["Pick a decade to live in.", "Now", "The 80s", "The 2000s", "The future"],
  ["Which would you pick to learn?", "A language", "An instrument", "A sport", "A craft"],
];

const TRAVEL: Row[] = [
  ["Your travel style?", "Plan every hour", "Rough plan", "Wing it", "Let you decide"],
  ["Pick a trip.", "Beach and chill", "Mountains and treks", "City and food", "Road trip"],
  ["Where do you stay?", "Fancy hotel", "Cosy homestay", "Camping", "Wherever is cheapest"],
  ["How do you pack?", "Light, one bag", "Sensible", "A bit much", "Pack at the last minute"],
  ["Pick a way to travel.", "Flight", "Train", "Car", "Bike"],
  ["Your ideal trip length?", "A weekend", "A week", "Two weeks", "As long as possible"],
  ["Pick a country to visit.", "Japan", "Italy", "Switzerland", "Thailand or Bali"],
  ["Your trip budget?", "Backpacker", "Comfortable", "Treat ourselves", "Luxury"],
  ["Photos on trips?", "Always", "A few", "Mostly videos", "Phone stays away"],
  ["Pick an adventure.", "Scuba diving", "Paragliding", "Trekking", "A food tour"],
  ["Hotel breakfast: yes or no?", "Always", "If it's good", "Skip it, explore", "Sleep through it"],
  ["Which do you prefer?", "Famous places", "Hidden gems", "Both", "Wherever there's food"],
  ["How do you get around?", "Walking", "Public transport", "Taxis", "Rent a car or bike"],
  ["Pick a souvenir.", "Magnets", "Local food", "Clothes or crafts", "Nothing, just memories"],
  ["Trip with friends or just us?", "Just us", "Friends", "Family", "Depends on the trip"],
  ["Your travel deal-breaker?", "Dirty rooms", "Bad food", "Long queues", "Nothing bothers me"],
  ["Pick a month to travel.", "Winter holidays", "Summer", "Monsoon", "Off-season"],
  ["Pick one forever.", "Beach sunsets", "Mountain mornings", "City lights", "Forest quiet"],
  ["What's your first thing on arrival?", "Find food", "Explore", "Rest", "Take photos"],
  ["Dream trip together?", "Around the world", "A cabin somewhere quiet", "A luxury cruise", "A long road trip"],
];

const SCREEN: Row[] = [
  ["Pick a movie night.", "Rom-com", "Thriller", "Comedy", "Animation or fantasy"],
  ["Series or movie?", "Series, binge it", "A movie", "Both", "Neither, I scroll"],
  ["Pick a music taste.", "Pop", "Bollywood", "Rock or indie", "Lo-fi or classical"],
  ["How loud is your music?", "Loud", "Medium", "Quiet background", "Headphones only"],
  ["Pick a game type.", "Board games", "Video games", "Card games", "I'd rather not"],
  ["Cinema or couch?", "Cinema", "Couch", "Open-air", "Depends on the movie"],
  ["Pick a movie length.", "Short and sweet", "Regular", "Epic and long", "Doesn't matter"],
  ["Pick a snack for a movie.", "Popcorn", "Chips", "Chocolate", "Pizza"],
  ["Which show do you rewatch?", "A sitcom", "A drama", "Anime or animation", "A reality show"],
  ["Pick a book kind.", "Novels", "Self-help", "Comics or manga", "I don't read much"],
  ["Concert or festival?", "Concert", "Festival", "Small gig", "Neither"],
  ["Subtitles on?", "Always", "Sometimes", "Never", "Only for languages I don't know"],
  ["Pick a podcast mood.", "Comedy", "True crime", "Learning", "I don't listen"],
  ["Dancing?", "Love it", "Only with you", "Only when I've had a drink", "Not at all"],
  ["Karaoke?", "Take the mic", "Only a duet", "Cheer from the side", "Never"],
  ["Which sounds fun?", "A quiz night", "A game night", "An art class", "A cooking class"],
  ["Best way to relax?", "Music", "Series", "A book", "A video game"],
  ["Favourite kind of story?", "Love stories", "Mysteries", "Adventures", "True stories"],
  ["Pick a theme night.", "Horror", "Throwback", "Musical", "Documentary"],
  ["Which would you do for fun?", "Sing", "Draw", "Dance", "Write"],
];

const DATES: Row[] = [
  ["Your ideal date?", "Dinner out", "A walk and a talk", "Something adventurous", "Staying in"],
  ["Best way to be surprised?", "Flowers or a gift", "A planned outing", "A note or message", "A home-cooked meal"],
  ["How do you like to be told you're loved?", "In words", "With little acts", "With time together", "With touch and hugs"],
  ["Pick a date-night start.", "Dressed up", "Casual", "Surprise me", "Straight to dessert"],
  ["Pick a gift.", "Jewellery or watch", "Gadget", "Books or art", "Something we can do together"],
  ["Anniversary plans?", "A trip", "A fancy dinner", "A quiet evening", "Surprise party"],
  ["Pick a gesture.", "Breakfast in bed", "A handwritten letter", "A surprise visit", "A playlist"],
  ["How much do you like surprises?", "Love them", "A little", "Only small ones", "Please don't"],
  ["Pick a cosy night.", "Blanket and movie", "Cooking together", "Board games", "A long chat"],
  ["How do you like to say sorry?", "Words", "A gesture", "Time", "A hug"],
  ["Public affection?", "All good", "A little", "Hand-holding only", "Keep it private"],
  ["Pick a first-date place.", "A café", "A restaurant", "A walk", "An activity"],
  ["Pick a date budget.", "Free or cheap", "Moderate", "Splurge sometimes", "Splurge always"],
  ["Your love language, if you had to pick?", "Words of affirmation", "Quality time", "Acts of service", "Physical touch"],
  ["Pick a romantic setting.", "Candlelit dinner", "Beach at night", "Rooftop", "A rainy window"],
  ["How often should we go on dates?", "Every week", "Twice a month", "Once a month", "Whenever it happens"],
  ["Pick a small thing that melts you.", "A good morning text", "Being remembered", "A forehead kiss", "Being listened to"],
  ["What do you want more of?", "Time together", "Surprises", "Talking", "Adventures"],
  ["Pick a date you'd love.", "Stargazing", "Cooking class", "Live music", "A picnic"],
  ["How do you like to make up after a fight?", "Talk it out", "Space first", "A hug first", "Something funny"],
];

export const ABOUT_CONTENT: Record<string, AboutQ[]> = {
  about_food: rows(FOOD),
  about_lifestyle: rows(LIFESTYLE),
  about_vibes: rows(VIBES),
  about_travel: rows(TRAVEL),
  about_screen: rows(SCREEN),
  about_dates: rows(DATES),
};

export const ABOUT_ROUND = 8; // questions in a new game
export const ABOUT_MIN = 3;
export const ABOUT_MAX = 12;
