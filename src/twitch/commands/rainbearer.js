export function createRainbearerHandler(rainbearerState) {
  return (client, target) => {
    if (target !== "#frampersand") return;

    if (!rainbearerState.current) {
      client.say(target, `There's currently not a rainbearer yet`);
    } else {
      client.say(
        target,
        `The current Rainbearer is ${rainbearerState.current}, pay your respects if you may, for they brought the downpour sounds for our enjoyment!`
      );
    }
  };
}
