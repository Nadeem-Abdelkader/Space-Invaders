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
  const CanvasSize = 600,
    torusWrap = ({ x, y }: Vec) => {
      const wrap = (v: number) =>
        v < 0 ? v + CanvasSize : v > CanvasSize ? v - CanvasSize : v;
      return new Vec(wrap(x), wrap(y));
    };

  class Tick {
    constructor(public readonly elapsed: number) {}
  }
  class Move {
    constructor(public readonly direction: number) {}
  }

  type State = Readonly<{
    pos: Vec;
    vel: Vec;
    acc: Vec;
    angle: number;
    rotation: number;
    torque: number;
  }>;
  const initialState: State = {
    pos: new Vec(245, 490),
    vel: Vec.Zero,
    acc: Vec.Zero,
    angle: 0,
    rotation: 0,
    torque: 0,
  };

  const reduceState = (s: State, e: Move | Tick) =>
    e instanceof Move
      ? { ...s, torque: e.direction }
      : {
          ...s,
          rotation: s.rotation + s.torque,
          angle: s.angle + s.rotation,
          pos: torusWrap(s.pos.add(Vec.unitVecInDirection(s.rotation))),
          vel: s.vel.add(s.acc),
        };

  const observeKey = <T>(eventName: string, k: Key, result: () => T) =>
    fromEvent<KeyboardEvent>(document, eventName).pipe(
      filter(({ code }) => code === k),
      filter(({ repeat }) => !repeat),
      map(result)
    );
  const 
    startLeftMove = observeKey("keydown","ArrowLeft",() => new Move(-0.1)),
    startRightMove = observeKey("keydown", "ArrowRight", () => new Move(0.1)),
    stopLeftMove = observeKey("keyup", "ArrowLeft", () => new Move(0)),
    stopRightMove = observeKey("keyup", "ArrowRight", () => new Move(0));

  
  function updateView(s: State) {
    const ship = document.getElementById("ship")!,
      show = (id: string, condition: boolean) =>
        ((e: HTMLElement) =>
          condition ? e.classList.remove("hidden") : e.classList.add("hidden"))(
          document.getElementById(id)!
        );
    show("leftThrust", s.torque < 0);
    show("rightThrust", s.torque > 0);
    ship.setAttribute(
      "transform",
      `translate(${s.pos.x},${s.pos.y})`
    );

  
  }


  interval(10)
    .pipe(
      map((elapsed) => new Tick(elapsed)),
      merge(startLeftMove, startRightMove, stopLeftMove, stopRightMove),
      scan(reduceState, initialState)
    )
    .subscribe(updateView);
}

class Vec {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}
  add = (b: Vec) => new Vec(this.x + b.x, this.y + b.y);
  sub = (b: Vec) => this.add(b.scale(-1));
  len = () => Math.sqrt(this.x * this.x + this.y * this.y);
  scale = (s: number) => new Vec(this.x * s, this.y * s);
  ortho = () => new Vec(this.y, -this.x);
  move = (deg: number) =>
     new Vec(deg,0)

  static unitVecInDirection = (deg: number) => new Vec(0, 0).move(deg);
  static Zero = new Vec();
}

// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != "undefined")
  window.onload = () => {
    spaceinvaders();
  };
