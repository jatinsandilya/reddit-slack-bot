import { getLatestPost, getLatestPosts } from "./reddit";
import {
  getLastCheckedId,
  setLastCheckedId,
  checkIfPostWasChecked,
  getTeamsAndKeywords,
  getTrackedSubreddit,
} from "./upstashReddit";
import { postScanner } from "./helpers";
import { sendSlackMessage } from "./slack";

export async function redditCron(subReddit: string) {
  // last checked post id from redis, latest post id from hacker news
  const [lastCheckedId, latestPostId] = await Promise.all([
    getLastCheckedId(subReddit),
    getLatestPost(subReddit),
  ]);

  // if (latestPostId === lastCheckedId) {
  //   // if latest post id is the same as last checked id, do nothing
  //   return { results: "No new posts" };
  // }

  const teamsAndKeywords = await getTeamsAndKeywords(); // get all team keys from redis
  const scanner = postScanner(teamsAndKeywords); // create a post scanner that contains all teams and their keywords in a constructed regex

  let results: {
    [postId: string]: string[]; // for each post, store the teams that it was sent to
  } = {};
  let errors: any[] = [];

  const latestPosts = await getLatestPosts(subReddit);
  for (let i = 0; i <= latestPosts.length; i++) {
    const post = latestPosts[i]; // get post from hacker news
    if (post === undefined) continue;
    // if (await checkIfPostWasChecked(post.id)) continue; // avoid double checking posts
    console.log("checking for keywords in post", post.id);
    const interestedTeams = Array.from(scanner(post)); // get teams that are interested in this post
    if (interestedTeams.length > 0) {
      results[i] = interestedTeams; // add post id and interested teams to results
      await Promise.all(
        interestedTeams.map(async (teamId) => {
          const subRedditForTeam = (
            await getTrackedSubreddit(teamId)
          )?.toLowerCase();
          if (post.subreddit.display_name != subRedditForTeam) {
            console.log(
              "Skipping since this team is not subbed to this subReddit",
              teamId,
              post.subreddit.display_name
            );
            return;
          }
          console.log("sending post to team", teamId);
          try {
            await sendSlackMessage(post.url + `?id=${post.id}`, teamId); // send post to team
          } catch (e) {
            console.log(
              `Error sending post ${i} to team ${teamId}. Cause of error: ${e}`
            );
            errors.push({
              error: e,
              postId: i,
              teamId: teamId,
            }); // if there's an error, add it to errors
          }
        })
      );
    }
  }

  await setLastCheckedId(latestPostId); // set last checked post id in redis
  return {
    summary: `Processed post ${lastCheckedId} to post ${latestPostId})`,
    results,
    errors,
  };
}
