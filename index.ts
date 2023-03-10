import { Handler, serve } from "https://deno.land/std@0.178.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

const port = 8080;
const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");
// Array of [<field to scan Linear webhook for>, <label for that field in a Discord message>]. Ordered from top to bottom.
const labels = [
  ["title", "Title"],
  ["description", "Description"],
  ["body", "Body"],
  ["priorityLabel", "Priority"],
  ["asignee?.name", "Asignee"],
  ["project?.name", "Project"],
  ["state?.name", "State"],
];

const handler: Handler = async (request: Request): Promise<Response> => {
  const message = await request.json();
  console.log(JSON.stringify(request.headers.entries()));
  console.log("New request: ", JSON.stringify(message));

  const fields = [];
  for (const [field, label] of labels) {
    const fieldData = eval(`message.data.${field}`);
    if (fieldData)
      fields.push({
        name: label,
        value: fieldData,
        inline: fieldData.length > 50 ? false : true,
      });
  }

  let body;
  try {
    if (webhook) {
      body = await fetch(webhook, {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          embeds: [
            {
              color: 6021786,
              title: `${message.type} ${message.action}d on ${message.data.team.name}'s Linear`,
              url: message.url,
              fields,
            },
          ],
        }),
      })
        .then((res) => res.text())
        .then(
          (json) =>
            `Sent message! Discord responded with: ` + JSON.stringify(json)
        );
    } else {
      throw new Error("Could not find webhook env var");
    }
  } catch (e) {
    console.error(e);
    return new Response(`Improperly formatted webhook request, ${e}`, {
      status: 400,
    });
  }

  return new Response(body, { status: 200 });
};

console.log(`HTTP server running on port ${port}`);
await serve(handler, { port });
