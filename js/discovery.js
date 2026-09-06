/**
 * STREAMFLIX - Discovery Seed Titles
 * Seed catalogs for various genres and categories to populate homepage and catalogs.
 * Note: OMDb requires title seeds since it does not have a trending endpoint.
 */

const DISCOVERY_CATEGORIES = {
  popular: [
    "Inception",
    "Interstellar",
    "The Dark Knight",
    "Avengers: Endgame",
    "Avatar",
    "Gladiator",
    "Dune",
    "Oppenheimer",
    "The Matrix",
    "Fight Club"
  ],
  top_rated: [
    "The Shawshank Redemption",
    "The Godfather",
    "The Dark Knight",
    "12 Angry Men",
    "Schindler's List",
    "Pulp Fiction",
    "The Lord of the Rings: The Return of the King",
    "Fight Club"
  ],
  action: [
    "Mad Max: Fury Road",
    "John Wick",
    "The Dark Knight",
    "Top Gun: Maverick",
    "Mission: Impossible - Fallout",
    "Die Hard",
    "Gladiator",
    "The Batman"
  ],
  adventure: [
    "Interstellar",
    "Avatar",
    "Jurassic Park",
    "Raiders of the Lost Ark",
    "The Lord of the Rings: The Fellowship of the Ring",
    "Pirates of the Caribbean: The Curse of the Black Pearl",
    "Life of Pi",
    "Cast Away"
  ],
  comedy: [
    "The Grand Budapest Hotel",
    "Superbad",
    "The Hangover",
    "Knives Out",
    "Deadpool",
    "Groundhog Day",
    "Step Brothers",
    "Palm Springs"
  ],
  drama: [
    "The Shawshank Redemption",
    "The Godfather",
    "Fight Club",
    "Forrest Gump",
    "Parasite",
    "Whiplash",
    "12 Angry Men",
    "Schindler's List"
  ],
  horror: [
    "The Shining",
    "A Quiet Place",
    "Get Out",
    "Hereditary",
    "The Conjuring",
    "Halloween",
    "Alien",
    "Psycho"
  ],
  scifi: [
    "Interstellar",
    "Blade Runner 2049",
    "The Matrix",
    "Inception",
    "Arrival",
    "Dune",
    "Ex Machina",
    "Edge of Tomorrow"
  ],
  romance: [
    "La La Land",
    "Titanic",
    "Before Sunrise",
    "About Time",
    "The Notebook",
    "Pride & Prejudice",
    "Her",
    "Past Lives"
  ],
  thriller: [
    "Se7en",
    "Shutter Island",
    "Gone Girl",
    "Zodiac",
    "Prisoners",
    "Memento",
    "The Silence of the Lambs",
    "Nightcrawler"
  ],
  animation: [
    "Spirited Away",
    "Spider-Man: Into the Spider-Verse",
    "Toy Story",
    "WALL-E",
    "Coco",
    "Your Name",
    "Up",
    "The Lion King"
  ],
  crime: [
    "Pulp Fiction",
    "GoodFellas",
    "The Departed",
    "The Godfather",
    "No Country for Old Men",
    "Heat",
    "Scarface",
    "Fargo"
  ],
  indian: [
    "RRR",
    "3 Idiots",
    "Dangal",
    "Lagaan",
    "Baahubali: The Beginning",
    "Gangs of Wasseypur",
    "K.G.F: Chapter 1",
    "Drishyam"
  ],
  hollywood: [
    "Titanic",
    "Avatar",
    "Jurassic Park",
    "The Avengers",
    "Pulp Fiction",
    "Inception",
    "Gladiator",
    "Forrest Gump"
  ],
  series: [
    "Breaking Bad",
    "Stranger Things",
    "Game of Thrones",
    "Chernobyl",
    "Better Call Saul",
    "The Wire",
    "Dark",
    "Fargo",
    "The Crown",
    "Sherlock"
  ]
};

window.DISCOVERY_CATEGORIES = DISCOVERY_CATEGORIES;
