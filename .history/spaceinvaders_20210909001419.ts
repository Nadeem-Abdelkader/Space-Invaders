import { fromEvent, interval } from "rxjs";
import { map, filter, scan, mergeMap, takeUntil, merge } from "rxjs/operators";

type Event = "keydown" | "keyup";
type Key = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "Space";

function spaceinvaders() {
  // Inside this function you will use the classes and functions
  // from rx.js
  // to add visuals to the svg element in pong.html, animate them, and make them interactive.
  // Study and complete the tasks in observable exampels first to get ideas.
  // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
  // You will be marked on your functional programming style
  // as well as the functionality that you implement.
  // Document your code!

  const CanvasSize = 600;

  class Tick {
    constructor(public readonly elapsed: number) {}
  }
  class Move {
    constructor(public readonly direction: number) {}
  }

  type State = Readonly<{
    x: number;
    y: number;
    movement: number;
  }>;
  const initialState: State = {
    x: 273,
    y: 520,
    movement: 0,
  };

  const reduceState = (s: State, e: Move | Tick) =>
    e instanceof Move
      ? { ...s, movement: e.direction }
      : {
          x: s.x + s.movement,
          y: s.y,
          movement: s.movement,
        };

  const observeKey = <T>(eventName: string, k: Key, result: () => T) =>
    fromEvent<KeyboardEvent>(document, eventName).pipe(
      filter(({ code }) => code === k),
      filter(({ repeat }) => !repeat),
      map(result)
    );

  const startLeftMove = observeKey("keydown", "ArrowLeft", () => new Move(-2)),
    startRightMove = observeKey("keydown", "ArrowRight", () => new Move(2)),
    stopLeftMove = observeKey("keyup", "ArrowLeft", () => new Move(0)),
    stopRightMove = observeKey("keyup", "ArrowRight", () => new Move(0));

  function updateView(s: State) {
    const ship = document.getElementById("ship")!,
      show = (id: string, condition: boolean) => (e: HTMLElement) =>
        document.getElementById(id)!;
    ship.setAttribute("transform", `translate(${s.x},${s.y})`);
  }

  interval(10)
    .pipe(
      map((elapsed) => new Tick(elapsed)),
      merge(startLeftMove, startRightMove, stopLeftMove, stopRightMove),
      scan(reduceState, initialState)
    )
    .subscribe(updateView);
}

// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != "undefined")
  window.onload = () => {
    spaceinvaders();
  };
