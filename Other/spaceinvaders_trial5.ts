import { fromEvent, interval } from "rxjs";
import { map, filter, scan, merge } from "rxjs/operators";

function spaceinvaders() {
  // Inside this function you will use the classes and functions
  // from rx.js
  // to add visuals to the svg element in pong.html, animate them, and make them interactive.
  // Study and complete the tasks in observable exampels first to get ideas.
  // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
  // You will be marked on your functional programming style
  // as well as the functionality that you implement.
  // Document your code!

  class Tick {
    constructor(public readonly elapsed: number) {}
  }
  class Rotate {
    constructor(public readonly direction: number) {}
  }
  class Thrust {
    constructor(public readonly on: boolean) {}
  }

  type Event = "keydown" | "keyup";
  type Key = "ArrowLeft" | "ArrowRight" | "ArrowUp";
  const observeKey = <T>(e: string, k: Key, result: () => T) =>
    fromEvent<KeyboardEvent>(document, e).pipe(
      filter(({ code }) => code === k),
      filter(({ repeat }) => !repeat),
      map(result)
    );
  const startLeftRotate = observeKey(
      "keydown",
      "ArrowLeft",
      () => new Rotate(-0.1)
    ),
    startRightRotate = observeKey(
      "keydown",
      "ArrowRight",
      () => new Rotate(0.1)
    ),
    stopLeftRotate = observeKey("keyup", "ArrowLeft", () => new Rotate(0)),
    stopRightRotate = observeKey("keyup", "ArrowRight", () => new Rotate(0)),
    startThrust = observeKey("keydown", "ArrowUp", () => new Thrust(true)),
    stopThrust = observeKey("keyup", "ArrowUp", () => new Thrust(false));

  class Vec {
    constructor(public readonly x: number = 0, public readonly y: number = 0) {}
    add = (b: Vec) => new Vec(this.x + b.x, this.y + b.y);
    sub = (b: Vec) => this.add(b.scale(-1));
    len = () => Math.sqrt(this.x * this.x + this.y * this.y);
    scale = (s: number) => new Vec(this.x * s, this.y * s);
    ortho = () => new Vec(this.y, -this.x);
    rotate = (deg: number) =>
      ((rad) =>
        ((cos, sin, { x, y }) => new Vec(x * cos - y * sin, x * sin + y * cos))(
          Math.cos(rad),
          Math.sin(rad),
          this
        ))((Math.PI * deg) / 180);

    static unitVecInDirection = (deg: number) => new Vec(0, -1).rotate(deg);
    static Zero = new Vec();
  }

  const CanvasSize = 600,
    torusWrap = ({ x, y }: Vec) => {
      const wrap = (v: number) =>
        v < 0 ? v + CanvasSize : v > CanvasSize ? v - CanvasSize : v;
      return new Vec(wrap(x), wrap(y));
    };

  type State = Readonly<{
    pos: Vec;
    vel: Vec;
    acc: Vec;
    angle: number;
    rotation: number;
    torque: number;
  }>;

  const initialState: State = {
    pos: new Vec(240, 490),
    vel: Vec.Zero,
    acc: Vec.Zero,
    angle: 0,
    rotation: 0,
    torque: 0,
  };

  function rotate(s:State, angleDelta:number): State {
    return { ...s, // copies the members of the input state for all but:
      angle: s.angle + angleDelta  // only the angle is different in the new State
    }
  }

  const reduceState = (s: State, e: Rotate | Thrust | Tick) =>
    e instanceof Rotate
      ? { ...s, torque: e.direction }
      : e instanceof Thrust
      ? {
          ...s,
          acc: e.on ? Vec.unitVecInDirection(s.angle).scale(0.05) : Vec.Zero,
        }
      : {
          ...s,
          rotation: s.rotation + s.torque,
          angle: s.angle + s.rotation,
          pos: torusWrap(s.pos.add(s.vel)),
          vel: s.vel.add(s.acc),
        };

  

  function updateView(s: State) {
    const ship = document.getElementById("ship")!,
      show = (id: string, condition: boolean) =>
        ((e: HTMLElement) =>
          condition ? e.classList.remove("hidden") : e.classList.add("hidden"))(
          document.getElementById(id)!
        );
    show("leftThrust", s.torque < 0);
    show("rightThrust", s.torque > 0);
    show("thruster", s.acc.len() > 0);
    ship.setAttribute(
      "transform",
      `translate(${s.pos.x},${s.pos.y}) rotate(${s.angle})`
    );
  }
  interval(10)
    .pipe(
      map((elapsed) => new Tick(elapsed)),
      merge(startLeftRotate, startRightRotate, stopLeftRotate, stopRightRotate),
      merge(startThrust, stopThrust),
      scan(reduceState, initialState)
    )
    .subscribe(updateView);
}

// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != "undefined")
  window.onload = () => {
    spaceinvaders();
  };
