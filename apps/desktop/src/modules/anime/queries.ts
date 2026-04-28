/**
 * AniList GraphQL Query Definitions
 *
 * All GraphQL queries for the AniList API are defined here
 * as template literal constants. This keeps queries centralized
 * and easy to maintain.
 */

/** Common media fields reused across queries */
const MEDIA_FIELDS_BASIC = `
  id
  title { romaji english native }
  coverImage { large medium }
  episodes
  status
  format
  genres
  averageScore
  popularity
  nextAiringEpisode { airingAt episode }
`;

export const SEARCH_ANIME_QUERY = `
query SearchAnime($search: String!, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
      ${MEDIA_FIELDS_BASIC}
      bannerImage
      season
      seasonYear
      description(asHtml: false)
    }
  }
}
`;

export const ANIME_DETAILS_QUERY = `
query AnimeDetails($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    title { romaji english native }
    coverImage { large extraLarge color }
    bannerImage
    episodes
    duration
    status
    season
    seasonYear
    format
    source
    genres
    averageScore
    meanScore
    popularity
    favourites
    isAdult
    siteUrl
    description(asHtml: false)
    startDate { year month day }
    endDate { year month day }
    trailer { id site thumbnail }
    tags { id name rank isGeneralSpoiler isMediaSpoiler }
    studios { edges { isMain node { id name isAnimationStudio } } }
    staff(perPage: 8, sort: RELEVANCE) {
      edges {
        role
        node {
          id
          name { full userPreferred }
          image { medium }
        }
      }
    }
    characters(perPage: 8, sort: [ROLE, RELEVANCE]) {
      edges {
        role
        node {
          id
          name { full userPreferred }
          image { medium }
        }
      }
    }
    nextAiringEpisode { airingAt episode timeUntilAiring }
    relations {
      edges {
        relationType
        node {
          id
          title { romaji english }
          format
          type
          status
          coverImage { medium }
          averageScore
        }
      }
    }
    recommendations(sort: RATING_DESC, perPage: 6) {
      nodes {
        mediaRecommendation {
          id
          title { romaji }
          coverImage { medium }
          format
          averageScore
        }
      }
    }
    externalLinks { url site type icon color }
    streamingEpisodes { title thumbnail url site }
    rankings { id rank type format year season allTime context }
    stats {
      scoreDistribution { score amount }
      statusDistribution { status amount }
    }
  }
}
`;

export const SEARCH_BY_TITLE_QUERY = `
query SearchByTitle($search: String!, $perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      idMal
      title { romaji english native }
    }
  }
}
`;

export const AIRING_SCHEDULE_QUERY = `
query AiringSchedule($airingAt_greater: Int, $airingAt_lesser: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
      id
      airingAt
      episode
      media {
        id
        title { romaji english native }
        coverImage { large medium }
        episodes
        status
        format
        genres
        averageScore
        popularity
      }
    }
  }
}
`;

export const TRENDING_ANIME_QUERY = `
query TrendingAnime($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: ANIME, sort: TRENDING_DESC) {
      ${MEDIA_FIELDS_BASIC}
    }
  }
}
`;

export const RANDOM_BY_GENRE_QUERY = `
query RandomByGenre($page: Int, $perPage: Int, $genre_in: [String], $genre_not_in: [String]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: ANIME, sort: POPULARITY_DESC, genre_in: $genre_in, genre_not_in: $genre_not_in, popularity_greater: 1000) {
      ${MEDIA_FIELDS_BASIC}
      bannerImage
      season
      seasonYear
      description(asHtml: false)
    }
  }
}
`;

export const POPULAR_THIS_SEASON_QUERY = `
query PopularThisSeason($season: MediaSeason, $seasonYear: Int, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC) {
      ${MEDIA_FIELDS_BASIC}
    }
  }
}
`;

export const USER_PROFILE_QUERY = `
query UserProfile($name: String!) {
  User(name: $name) {
    id
    name
    avatar { large medium }
    bannerImage
    about
    siteUrl
    createdAt
    statistics {
      anime {
        count
        meanScore
        standardDeviation
        minutesWatched
        episodesWatched
        genres(limit: 10, sort: COUNT_DESC) { genre count meanScore minutesWatched }
        formats(sort: COUNT_DESC) { format count meanScore minutesWatched }
        statuses(sort: COUNT_DESC) { status count meanScore minutesWatched }
        scores(sort: COUNT_DESC) { score count meanScore }
        releaseYears(limit: 10, sort: COUNT_DESC) { releaseYear count meanScore }
        studios(limit: 10, sort: COUNT_DESC) { studio { name } count meanScore minutesWatched }
        tags(limit: 15, sort: COUNT_DESC) { tag { name } count meanScore }
      }
    }
    favourites {
      anime(perPage: 10) {
        nodes { id title { romaji english native } coverImage { large medium } }
      }
    }
  }
}
`;
