import { fromEvent, interval, of, range } from "rxjs";
import { map, filter, scan, mergeMap, takeUntil, merge } from "rxjs/operators";
function spaceinvaders() {
  // Inside this function you will use the classes and functions
  // from rx.js
  // to add visuals to the svg element in pong.html, animate them, and make them interactive.
  // Study and complete the tasks in observable exampels first to get ideas.
  // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
  // You will be marked on your functional programming style
  // as well as the functionality that you implement.
  // Document your code!

  ////////////////////////////////////////////////////////////////
  // const rocks = [...Array(5)].map((_) => {
  //   const svg = document.getElementById("canvas")!;
  //   const v = document.createElementNS(svg.namespaceURI, "circle")!;
  //   attr(v, { cx: Math.random() * (600 - 0) + 0, cy: 300, r: 25 });
  //   v.classList.add("rock");
  //   console.log(v);
  //   return v;
  // });
  // const svg = document.getElementById("canvas")!;

  // for (let n = 0; n < 5; n++) {
  //   svg.appendChild(rocks[n]);
  // }
  // console.log(rocks);

  // // svg.appendChild(v);

  // const obs$ = of("200", "210", "220", "230", "240", "250").subscribe(
  //   console.log
  // );
  ////////////////////////////////////////////////////////////////
  const CanvasSize = 600;

  class Tick {
    constructor(public readonly elapsed: number) {}
  }
  class Move {
    constructor(public readonly direction: number) {}
  }

  type Event = "keydown" | "keyup";
  type Key = "ArrowLeft" | "ArrowRight" | "ArrowUp";
  const observeKey = <T>(eventName: string, k: Key, result: () => T) =>
      fromEvent<KeyboardEvent>(document, eventName).pipe(
        filter(({ code }) => code === k),
        filter(({ repeat }) => !repeat),

        map(result)
      ),
    startLeftMove = observeKey("keydown", "ArrowLeft", () => new Move(-0.1)),
    startRightMove = observeKey("keydown", "ArrowRight", () => new Move(0.1)),
    stopLeftMove = observeKey("keyup", "ArrowLeft", () => new Move(0)),
    stopRightMove = observeKey("keyup", "ArrowRight", () => new Move(0));

  type State = Readonly<{
    x: number;
    y: number;
    angle: number;
    rotation: number;
    torque: number;
  }>;
  const initialState: State = {
    x: 273,
    y: 525,
    angle: 0,
    rotation: 0,
    torque: 0,
  };

  const reduceState = (s: State, e: Move | Tick) =>
    e instanceof Move
      ? { ...s, torque: e.direction }
      : {
          x: s.x + s.rotation,
          y: s.y,
          angle: s.angle + s.rotation,
          rotation: s.rotation + s.torque,
          torque: s.torque,
        };

  function move(s: State, angleDelta: number): State {
    return {
      x: s.x + angleDelta,
      y: s.y,
      ...s,
    };
  }
  function updateView(state: State): any {
    // console.log(state)
    const ship = document.getElementById("ship")!;
    ship.setAttribute("transform", `translate(${state.x},${state.y})`);
  }

  // const move$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
  //   filter(({ code }) => code === "ArrowLeft" || code === "ArrowRight"),
  //   filter(({ repeat }) => !repeat),
  //   mergeMap((d) =>
  //     interval(10).pipe(
  //       takeUntil(
  //         fromEvent<KeyboardEvent>(document, "keyup").pipe(
  //           filter(({ code }) => code === d.code)
  //         )
  //       ),
  //       map((_) => d)
  //     )
  //   ),
  //   map(({ code }) => (code === "ArrowLeft" ? -2 : 2)),
  //   scan(move, initialState)
  // );

  // const rocks$ = of(...Array(5))
  // .pipe(
  //   map((_) => {
  //     const svg = document.getElementById("canvas")!;
  //     const v = document.createElementNS(svg.namespaceURI, "circle")!;
  //     attr(v, { cx: Math.random() * (500 - 100) + 100, cy: 300, r: 20 });
  //     v.classList.add("rock");
  //       svg.appendChild(v);
  //     return v;
  //   })).subscribe(console.log)

  interval(10)
    .pipe(
      map((elapsed) => new Tick(elapsed)),
      merge(startLeftMove, startRightMove, stopLeftMove, stopRightMove),
      scan(reduceState, initialState)
    )
    .subscribe(updateView);
}
const attr = (e: Element, o: Object) => {
  for (const k in o) e.setAttribute(k, String(o[k]));
};
// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != "undefined")
  window.onload = () => {
    spaceinvaders();
  };
