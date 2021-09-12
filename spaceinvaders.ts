// References
// code: https://tgdwyer.github.io/asteroids/
// image: http://pixelartmaker.com/art/e4af22756166f44

import { fromEvent, interval, merge } from "rxjs";
import { map, filter, scan } from "rxjs/operators";

type Key = "ArrowLeft" | "ArrowRight" | "Space";
type Event = "keydown" | "keyup";

function spaceinvaders() {
  // Inside this function you will use the classes and functions
  // from rx.js
  // to add visuals to the svg element in pong.html, animate them, and make them interactive.
  // Study and complete the tasks in observable exampels first to get ideas.
  // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
  // You will be marked on your functional programming style
  // as well as the functionality that you implement.
  // Document your code!

  const Constants = {
    CanvasSize: 600,
    BulletExpirationTime: 1000,
    BulletRadius: 3,
    BulletVelocity: 2,
    StartAlienRadius: 15,
    StartAlienCount: 50,
    RotationAcc: 0.1,
    StartTime: 0,
  } as const;

  type ViewType = "ship" | "alien" | "bullet";

  class Tick {
    constructor(public readonly elapsed: number) {}
  }
  class Move {
    constructor(public readonly direction: number) {}
  }
  class Shoot {
    constructor() {}
  }

  const gameClock = interval(10).pipe(map((elapsed) => new Tick(elapsed))),
    keyObservable = <T>(e: Event, k: Key, result: () => T) =>
      fromEvent<KeyboardEvent>(document, e).pipe(
        filter(({ code }) => code === k),
        filter(({ repeat }) => !repeat),
        map(result)
      ),
    startLeftMove = keyObservable("keydown", "ArrowLeft", () => new Move(-0.1)),
    startRightMove = keyObservable(
      "keydown",
      "ArrowRight",
      () => new Move(0.1)
    ),
    stopLeftMove = keyObservable("keyup", "ArrowLeft", () => new Move(0)),
    stopRightMove = keyObservable("keyup", "ArrowRight", () => new Move(0)),
    shoot = keyObservable("keydown", "Space", () => new Shoot());

  type Body = Readonly<{
    id: string;
    viewType: ViewType;
    pos: Vec;
    vel: Vec;
    acc: Vec;
    angle: number;
    rotation: number;
    torque: number;
    radius: number;
    createTime: number;
  }>;

  type State = Readonly<{
    time: number;
    ship: Body;
    bullets: ReadonlyArray<Body>;
    aliens: ReadonlyArray<Body>;
    exit: ReadonlyArray<Body>;
    objCount: number;
    gameOver: boolean;
    win: boolean;
  }>;

  const createCircle =
    (viewType: ViewType) =>
    (oid: number) =>
    (time: number) =>
    (radius: number) =>
    (pos: Vec) =>
    (vel: Vec) =>
      <Body>{
        createTime: time,
        pos: pos,
        vel: vel,
        acc: Vec.Zero,
        angle: 0,
        rotation: 0,
        torque: 0,
        radius: radius,
        id: viewType + oid,
        viewType: viewType,
      };

  function createShip(): Body {
    return {
      id: "ship",
      viewType: "ship",
      pos: new Vec(273, 520),
      vel: Vec.Zero,
      acc: Vec.Zero,
      angle: 0,
      rotation: 0,
      torque: 0,
      radius: 20,
      createTime: 0,
    };
  }

  const startAliens = [...Array(Constants.StartAlienCount)].map((_, i) =>
      createCircle("alien")(i)(Constants.StartTime)(Constants.StartAlienRadius)(
        new Vec(
          Math.random() * (550 - 50) + 50,
          Math.random() * (350 - 150) + 150
        )
      )(new Vec(0.5 - Math.random(), 0.5 - Math.random()))
    ),
    initialState: State = {
      time: 0,
      ship: createShip(),
      bullets: [],
      aliens: startAliens,
      exit: [],
      objCount: Constants.StartAlienCount,
      gameOver: false,
      win: false,
    },
    torusWrap = ({ x, y }: Vec) => {
      const s = Constants.CanvasSize,
        wrap = (v: number) => (v < 0 ? v + s : v > s ? v - s : v);
      return new Vec(wrap(x), wrap(y));
    },
    moveBody = (o: Body) =>
      <Body>{
        ...o,
        rotation: o.rotation + o.torque,
        angle: o.angle,
        pos: torusWrap(new Vec(o.pos.x + o.rotation, o.pos.y + o.vel.y)),
        vel: o.vel.add(o.acc),
      },
    handleCollisions = (s: State) => {
      const bodiesCollided = ([a, b]: [Body, Body]) =>
          a.pos.sub(b.pos).len() < a.radius + b.radius,
        shipCollided =
          s.aliens.filter((r) => bodiesCollided([s.ship, r])).length > 0,
        allBulletsAndAliens = flatMap(s.bullets, (b) =>
          s.aliens.map((r) => [b, r])
        ),
        collidedBulletsAndAliens = allBulletsAndAliens.filter(bodiesCollided),
        collidedBullets = collidedBulletsAndAliens.map(([bullet, _]) => bullet),
        collidedAliens = collidedBulletsAndAliens.map(([_, alien]) => alien),
        cut = except((a: Body) => (b: Body) => a.id === b.id);

      return <State>{
        ...s,
        bullets: cut(s.bullets)(collidedBullets),
        aliens: cut(s.aliens)(collidedAliens),
        exit: s.exit.concat(collidedBullets, collidedAliens),
        objCount: s.objCount,
        gameOver: shipCollided,
        win:
          Constants.StartAlienCount - s.aliens.length ==
          Constants.StartAlienCount,
      };
    },
    tick = (s: State, elapsed: number) => {
      const expired = (b: Body) => elapsed - b.createTime > 230,
        expiredBullets: Body[] = s.bullets.filter(expired),
        activeBullets = s.bullets.filter(not(expired));
      return handleCollisions({
        ...s,
        ship: moveBody(s.ship),
        bullets: activeBullets.map(moveBody),
        aliens: s.aliens.map(
          (o: Body) =>
            <Body>{
              ...o,
              rotation: o.rotation + o.torque,
              angle: o.angle + o.rotation,
              pos: torusWrap(o.pos.add(new Vec(o.vel.x, 0))),
              vel: o.vel.add(o.acc),
            }
        ),
        exit: expiredBullets,
        time: elapsed,
      });
    },
    reduceState = (s: State, e: Move | Tick | Shoot) =>
      e instanceof Move
        ? { ...s, ship: { ...s.ship, torque: e.direction } }
        : e instanceof Shoot
        ? {
            ...s,
            bullets: s.bullets.concat([
              ((unitVec: Vec) =>
                createCircle("bullet")(s.objCount)(s.time)(
                  Constants.BulletRadius
                )(
                  s.ship.pos
                    .add(unitVec.scale(s.ship.radius))
                    .add(new Vec(25, 25))
                )(s.ship.vel.add(unitVec.scale(Constants.BulletVelocity))))(
                Vec.unitVecInDirection(s.ship.angle)
              ),
            ]),
            objCount: s.objCount + 1,
          }
        : tick(s, e.elapsed);

  const subscription = merge(
    gameClock,
    startLeftMove,
    startRightMove,
    stopLeftMove,
    stopRightMove,
    shoot
  )
    .pipe(scan(reduceState, initialState))
    .subscribe(updateView);

  function updateView(s: State) {
    document.getElementById("score").innerHTML = String(
      Constants.StartAlienCount - s.aliens.length
    );

    const svg = document.getElementById("svgCanvas")!,
      ship = document.getElementById("ship")!,
      show = (id: string, condition: boolean) =>
        ((e: HTMLElement) =>
          condition ? e.classList.remove("hidden") : e.classList.add("hidden"))(
          document.getElementById(id)!
        ),
      updateBodyView = (b: Body) => {
        function createBodyView() {
          const v = document.createElementNS(svg.namespaceURI, "ellipse")!;
          attr(v, { id: b.id, rx: b.radius, ry: b.radius, fill: "black" });
          v.classList.add(b.viewType);
          svg.appendChild(v);
          return v;
        }
        const v = document.getElementById(b.id) || createBodyView();
        attr(v, { cx: b.pos.x, cy: b.pos.y });
      };
    attr(ship, {
      transform: `translate(${s.ship.pos.x},${s.ship.pos.y})`,
    });
    // REMOVE????
    show("leftThrust", s.ship.torque < 0);
    show("rightThrust", s.ship.torque > 0);
    show("thruster", s.ship.acc.len() > 0);
    s.bullets.forEach(updateBodyView);
    s.aliens.forEach(updateBodyView);
    s.exit
      .map((o) => document.getElementById(o.id))
      .filter(isNotNullOrUndefined)
      .forEach((v) => {
        try {
          svg.removeChild(v);
        } catch (e) {
          console.log("Already removed: " + v.id);
        }
      });
    if (s.gameOver) {
      subscription.unsubscribe();
      const v = document.createElementNS(svg.namespaceURI, "text")!;
      attr(v, {
        x: Constants.CanvasSize / 6,
        y: Constants.CanvasSize / 2,
        class: "gameover",
      });
      v.textContent = "Game Over";
      svg.appendChild(v);
    }

    if (s.win) {
      subscription.unsubscribe();
      const v = document.createElementNS(svg.namespaceURI, "text")!;
      attr(v, {
        x: Constants.CanvasSize / 4,
        y: Constants.CanvasSize / 2,
        class: "win",
      });
      v.textContent = "You Win!";
      svg.appendChild(v);
    }
  }
}

//window.onload = asteroids;
setTimeout(spaceinvaders, 0);

function showKeys() {
  function showKey(k: Key) {
    const arrowKey = document.getElementById(k)!,
      o = (e: Event) =>
        fromEvent<KeyboardEvent>(document, e).pipe(
          filter(({ code }) => code === k)
        );
    o("keydown").subscribe((e) => arrowKey.classList.add("highlight"));
    o("keyup").subscribe((_) => arrowKey.classList.remove("highlight"));
  }
  showKey("ArrowLeft");
  showKey("ArrowRight");
  showKey("Space");
}

setTimeout(showKeys, 0);

/////////////////////////////////////////////////////////////////////
// Utility functions

/**
 * A simple immutable vector class
 */
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

/**
 * apply f to every element of a and return the result in a flat array
 * @param a an array
 * @param f a function that produces an array
 */
function flatMap<T, U>(
  a: ReadonlyArray<T>,
  f: (a: T) => ReadonlyArray<U>
): ReadonlyArray<U> {
  return Array.prototype.concat(...a.map(f));
}

const /**
   * Composable not: invert boolean result of given function
   * @param f a function returning boolean
   * @param x the value that will be tested with f
   */
  not =
    <T>(f: (x: T) => boolean) =>
    (x: T) =>
      !f(x),
  /**
   * is e an element of a using the eq function to test equality?
   * @param eq equality test function for two Ts
   * @param a an array that will be searched
   * @param e an element to search a for
   */
  elem =
    <T>(eq: (_: T) => (_: T) => boolean) =>
    (a: ReadonlyArray<T>) =>
    (e: T) =>
      a.findIndex(eq(e)) >= 0,
  /**
   * array a except anything in b
   * @param eq equality test function for two Ts
   * @param a array to be filtered
   * @param b array of elements to be filtered out of a
   */
  except =
    <T>(eq: (_: T) => (_: T) => boolean) =>
    (a: ReadonlyArray<T>) =>
    (b: ReadonlyArray<T>) =>
      a.filter(not(elem(eq)(b))),
  /**
   * set a number of attributes on an Element at once
   * @param e the Element
   * @param o a property bag
   */
  attr = (e: Element, o: Object) => {
    for (const k in o) e.setAttribute(k, String(o[k]));
  };
/**
 * Type guard for use in filters
 * @param input something that might be null or undefined
 */
function isNotNullOrUndefined<T extends Object>(
  input: null | undefined | T
): input is T {
  return input != null;
}
