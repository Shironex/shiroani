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

/**
 * Unified browse/search query (items 2 + 6).
 *
 * One parameterized `media()` call drives every browse mode (trending,
 * popular, seasonal, search) plus the advanced filters. The caller supplies a
 * `MediaSort` array and any subset of the filter args; unused args are passed
 * as `undefined` and AniList ignores them. Carries the richer card fields
 * (banner/season/year/description) so filtered results render in the grid and
 * the info dialog identically to search results.
 */
export const BROWSE_MEDIA_QUERY = `
query BrowseMedia(
  $page: Int,
  $perPage: Int,
  $search: String,
  $sort: [MediaSort],
  $season: MediaSeason,
  $seasonYear: Int,
  $format: MediaFormat,
  $status: MediaStatus,
  $genre_in: [String],
  $genre_not_in: [String],
  $tag_in: [String],
  $averageScore_greater: Int,
  $averageScore_lesser: Int
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(
      type: ANIME,
      search: $search,
      sort: $sort,
      season: $season,
      seasonYear: $seasonYear,
      format: $format,
      status: $status,
      genre_in: $genre_in,
      genre_not_in: $genre_not_in,
      tag_in: $tag_in,
      averageScore_greater: $averageScore_greater,
      averageScore_lesser: $averageScore_lesser
    ) {
      ${MEDIA_FIELDS_BASIC}
      bannerImage
      season
      seasonYear
      description(asHtml: false)
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
