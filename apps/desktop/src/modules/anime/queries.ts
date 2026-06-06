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
  $averageScore_lesser: Int,
  $onList: Boolean
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
      averageScore_lesser: $averageScore_lesser,
      onList: $onList
    ) {
      ${MEDIA_FIELDS_BASIC}
      bannerImage
      season
      seasonYear
      description(asHtml: false)
      mediaListEntry { status }
    }
  }
}
`;

/**
 * Community recommendations browse (item C5). `Page.recommendations` pairs a
 * source `media` with a recommended `mediaRecommendation`, sorted by net
 * community vote (`RATING_DESC`). Optionally seeded by a source `$mediaId` to get
 * recommendations stemming from a specific anime. `userRating` reflects the
 * connected viewer's own vote (NO_RATING when unauthed). Authed selection of
 * `userRating` does not error when unauthenticated.
 */
export const RECOMMENDATIONS_QUERY = `
query CommunityRecommendations($perPage: Int, $mediaId: Int) {
  Page(perPage: $perPage) {
    recommendations(sort: RATING_DESC, mediaId: $mediaId) {
      id
      rating
      userRating
      media {
        id
        title { romaji english native }
        coverImage { large medium }
        format
        averageScore
      }
      mediaRecommendation {
        id
        title { romaji english native }
        coverImage { large medium }
        format
        averageScore
      }
    }
  }
}
`;

/**
 * Vote on a community recommendation (item C4). The `SaveRecommendation` mutation
 * casts (RATE_UP/RATE_DOWN) or clears (NO_RATING) the connected viewer's vote on
 * a (media, mediaRecommendation) pairing. Requires auth. Returns the resulting
 * `userRating`.
 */
export const SAVE_RECOMMENDATION_MUTATION = `
mutation AniListSaveRecommendation($mediaId: Int, $mediaRecommendationId: Int, $rating: RecommendationRating) {
  SaveRecommendation(mediaId: $mediaId, mediaRecommendationId: $mediaRecommendationId, rating: $rating) {
    id
    rating
    userRating
  }
}
`;

/**
 * Full anime MediaList for a user (two-way sync, read side).
 *
 * `MediaListCollection` returns every list (Watching/Completed/Planning/…) in a
 * single response — no pagination needed. `score(format: POINT_100)` normalizes
 * the score to the 0–100 scale regardless of the user's display format, so the
 * reconciler never has to know the user's `scoreFormat`.
 *
 * `media.idMal` is the anime's MyAnimeList id (AniList maintains the cross-ref).
 * It's selected here so the AniList sync can populate the local `mal_id` column
 * for free — the MAL sync then matches by exact id instead of a fragile title
 * search. `null` when AniList has no MAL mapping for that media.
 */
export const MEDIA_LIST_COLLECTION_QUERY = `
query AniListMediaList($userId: Int!) {
  MediaListCollection(userId: $userId, type: ANIME) {
    lists {
      entries {
        mediaId
        status
        progress
        score(format: POINT_100)
        notes
        updatedAt
        media {
          id
          idMal
          episodes
          title { romaji english native }
          coverImage { large medium }
        }
      }
    }
  }
}
`;

/**
 * A SINGLE MediaList entry for a user + media (two-way sync, single-entry read
 * side). AniList returns a GraphQL error with status 404 (`"Not Found."`) when
 * the user has no list entry for that media — the client maps that to `null`.
 * `score(format: POINT_100)` normalizes the score like the collection query.
 */
export const MEDIA_LIST_ENTRY_QUERY = `
query AniListMediaListEntry($mediaId: Int, $userId: Int) {
  MediaList(mediaId: $mediaId, userId: $userId) {
    status
    progress
    score(format: POINT_100)
    notes
    updatedAt
    media {
      idMal
      episodes
      title { romaji english native }
      coverImage { large medium }
    }
  }
}
`;

/**
 * Shared user/viewer selection set. The AniList `User` and `Viewer` objects are
 * structurally identical, so both the public-username profile query and the
 * authenticated viewer query reuse this fragment body — keeping their statistics
 * and favourites in lockstep. Favourites are public on AniList, so the username
 * path gets them too.
 */
const USER_PROFILE_FIELDS = `
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
      startYears(limit: 10, sort: COUNT_DESC) { startYear count meanScore minutesWatched }
      lengths(limit: 10, sort: COUNT_DESC) { length count meanScore minutesWatched }
      countries(limit: 10, sort: COUNT_DESC) { country count meanScore minutesWatched }
      studios(limit: 10, sort: COUNT_DESC) { studio { name } count meanScore minutesWatched }
      tags(limit: 15, sort: COUNT_DESC) { tag { name } count meanScore }
      voiceActors(limit: 10, sort: COUNT_DESC) {
        voiceActor { id name { full userPreferred } image { large medium } }
        count meanScore minutesWatched
      }
      staff(limit: 10, sort: COUNT_DESC) {
        staff { id name { full userPreferred } image { large medium } }
        count meanScore minutesWatched
      }
    }
  }
  favourites {
    anime(perPage: 10) {
      nodes { id title { romaji english native } coverImage { large medium } }
    }
    manga(perPage: 10) {
      nodes { id title { romaji english native } coverImage { large medium } }
    }
    characters(perPage: 10) {
      nodes { id name { full userPreferred } image { large medium } }
    }
    staff(perPage: 10) {
      nodes { id name { full userPreferred } image { large medium } }
    }
    studios(perPage: 10) {
      nodes { id name }
    }
  }
`;

export const USER_PROFILE_QUERY = `
query UserProfile($name: String!) {
  User(name: $name) {
    ${USER_PROFILE_FIELDS}
  }
}
`;

/**
 * The authenticated viewer's OWN profile. Uses the same field set as the public
 * profile query but resolves the connected account via `Viewer` (auth required),
 * so it surfaces the viewer's private statistics. Never cached — must reflect
 * fresh sync state.
 */
export const VIEWER_PROFILE_QUERY = `
query ViewerProfile {
  Viewer {
    ${USER_PROFILE_FIELDS}
  }
}
`;

/**
 * The authenticated viewer's recent activity feed. `activities` is an
 * ActivityUnion; inline fragments pull only the fields the renderer needs.
 * `__typename` is the discriminator the mapper switches on; MessageActivity
 * entries (no fragment) are dropped.
 */
export const VIEWER_ACTIVITY_QUERY = `
query ViewerActivity($userId: Int!) {
  Page(perPage: 25) {
    activities(userId: $userId, sort: ID_DESC) {
      __typename
      ... on ListActivity {
        id
        status
        progress
        createdAt
        media {
          id
          title { romaji english native }
          coverImage { large medium }
        }
      }
      ... on TextActivity {
        id
        text
        createdAt
      }
    }
  }
}
`;

/**
 * The people a user FOLLOWS. `Page.following(userId:)` returns the `User`s the
 * given user follows; `isFollowing` is whether the CONNECTED viewer follows each
 * one (drives the follow/unfollow toggle). Requires auth (the `userId` is the
 * connected viewer's own id, resolved main-side).
 */
export const FOLLOWING_QUERY = `
query AniListFollowing($userId: Int!) {
  Page(perPage: 50) {
    following(userId: $userId) {
      id
      name
      avatar { large }
      isFollowing
      siteUrl
    }
  }
}
`;

/**
 * The people who FOLLOW a user. Mirror of {@link FOLLOWING_QUERY} via
 * `Page.followers(userId:)`. `isFollowing` is whether the connected viewer
 * follows each follower back.
 */
export const FOLLOWERS_QUERY = `
query AniListFollowers($userId: Int!) {
  Page(perPage: 50) {
    followers(userId: $userId) {
      id
      name
      avatar { large }
      isFollowing
      siteUrl
    }
  }
}
`;

/**
 * Toggle the connected viewer's follow state for a user (AniList `ToggleFollow`
 * flips the current state). Returns the user with the NEW `isFollowing`. Authed.
 */
export const TOGGLE_FOLLOW_MUTATION = `
mutation AniListToggleFollow($userId: Int!) {
  ToggleFollow(userId: $userId) {
    id
    isFollowing
  }
}
`;

/**
 * The social activity feed of the people the connected viewer FOLLOWS.
 * `activities(isFollowing: true)` is token-relative — it returns the followed
 * users' activities WITHOUT a `userId` argument, so the service must NOT pass
 * one. Same inline-fragment shape as {@link VIEWER_ACTIVITY_QUERY}, but each
 * entry additionally selects its author (`user`) so the renderer can show who
 * posted it. `type_in` restricts to list + text activities.
 */
export const SOCIAL_FEED_QUERY = `
query AniListSocialFeed {
  Page(perPage: 30) {
    activities(isFollowing: true, sort: ID_DESC, type_in: [ANIME_LIST, TEXT]) {
      __typename
      ... on ListActivity {
        id
        status
        progress
        createdAt
        user { id name avatar { large } }
        media {
          id
          title { romaji english native }
          coverImage { large medium }
        }
      }
      ... on TextActivity {
        id
        text
        createdAt
        user { id name avatar { large } }
      }
    }
  }
}
`;

/**
 * The connected viewer's notifications + unread count. `Viewer.unreadNotificationCount`
 * is the badge number; `Page.notifications` is a `NotificationUnion`, so inline
 * fragments pull only the fields each variant the renderer surfaces actually has.
 *
 * IMPORTANT per-variant field differences (verified against the AniList schema):
 *  - `AiringNotification` has `contexts` (a `[String]` like ["Episode ", " of ",
 *    " aired."]) — NOT a singular `context` — plus `episode`, `animeId`, `media`.
 *  - `FollowingNotification` / `ActivityLike|Reply|MentionNotification` /
 *    `RelatedMediaAdditionNotification` each have a singular `context: String`.
 *  - the activity-* variants carry `activityId` + `user`; related-media carries
 *    `media`; following carries `user`.
 *
 * `resetNotificationCount: false` keeps this read-only (the badge stays until the
 * user explicitly clears it via {@link MARK_NOTIFICATIONS_READ_QUERY}). `__typename`
 * is the discriminator the mapper switches on; unhandled union members (thread /
 * message / etc.) carry only `__typename` and are dropped.
 *
 * NOTE: `Page.notifications` takes NO `sort` argument (its only args are
 * `resetNotificationCount` / `type` / `type_in` — there is no `NotificationSort`
 * enum). AniList already returns notifications newest-first, so the desired
 * ID_DESC ordering holds without an explicit sort.
 */
export const NOTIFICATIONS_QUERY = `
query AniListNotifications {
  Viewer {
    unreadNotificationCount
  }
  Page(perPage: 30) {
    notifications(resetNotificationCount: false) {
      __typename
      ... on AiringNotification {
        id
        type
        episode
        contexts
        createdAt
        media {
          id
          title { romaji english native }
          coverImage { large medium }
        }
      }
      ... on FollowingNotification {
        id
        type
        context
        createdAt
        user { id name avatar { large medium } }
      }
      ... on ActivityLikeNotification {
        id
        type
        context
        activityId
        createdAt
        user { id name avatar { large medium } }
      }
      ... on ActivityReplyNotification {
        id
        type
        context
        activityId
        createdAt
        user { id name avatar { large medium } }
      }
      ... on ActivityMentionNotification {
        id
        type
        context
        activityId
        createdAt
        user { id name avatar { large medium } }
      }
      ... on RelatedMediaAdditionNotification {
        id
        type
        context
        createdAt
        media {
          id
          title { romaji english native }
          coverImage { large medium }
        }
      }
    }
  }
}
`;

/**
 * Reset the viewer's unread notification count. AniList clears the count as a
 * side-effect of selecting `notifications(resetNotificationCount: true)`, so this
 * query exists purely to trigger that reset — it selects only `__typename` and
 * the caller ignores the result. Authed.
 */
export const MARK_NOTIFICATIONS_READ_QUERY = `
query AniListMarkNotificationsRead {
  Page(perPage: 1) {
    notifications(resetNotificationCount: true) {
      __typename
    }
  }
}
`;
