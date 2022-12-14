import Snoowrap from "snoowrap";

const client = new Snoowrap({
  userAgent: "jatin-localhost",
  clientId: "9I2ayLSXtHaMP2dmo2GQkQ",
  clientSecret: "4MKGbJ4-_kt_GzbGyRrVBqGIlVuUxg",
  accessToken: "247055007568-7UR6WTxr7PHSrfyZQ6XvuVMqKqYcZQ",
  refreshToken: "247055007568-0Kw3Llx21ojpFqlSXR3mU_JO9uuqPQ",
});

export async function getLatestPost(subReddit?: string) {
  /* get latest post id from Reddit*/
  return (await client.getNew(subReddit, { limit: 1 }))[0].id;
}

export async function getLatestPosts(subReddit?: string) {
  /* get latest post id from Reddit*/
  return await client.getNew(subReddit, { limit: 20 });
}

function getSubComments(comment: Snoowrap.Comment, allComments: any) {
  allComments.push(comment.body);
  let replies: any = [];
  if (!comment.replies) {
    replies = [];
  } else {
    replies = comment.replies;
  }
  replies.forEach((reply: Snoowrap.Comment) =>
    getSubComments(reply, allComments)
  );
}
//@ts-ignore
export async function getPost(id: string) {
  /* get post data using its id from hacker news */
  const run = async () => {
    console.log("fetching post", id);
    //@ts-ignore
    return client
      .getSubmission(id)
      .fetch() //@ts-ignore
      .then(async (submission) => {
        if (submission === null) {
          throw new Error("Submission not found!");
        }
        const comments = await submission.comments.fetchAll();

        const commentList: any = [];
        comments.forEach((c) => {
          getSubComments(c, commentList);
        });
        let submissionWithComments = { ...submission, comments: "" };
        if (commentList.length)
          submissionWithComments.comments = commentList.reduce(
            (a: any, b: any) => a + "\n" + b + "\n"
          );
        return submissionWithComments;
      });
  };
  try {
    return await run();
  } catch (e) {
    console.log("error", e);
    return null;
  }
}
