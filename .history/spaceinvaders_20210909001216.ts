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
  class Shoot {
    constructor() {}
  }

  type Body = Readonly<{
    id: string;
    x: number;
    y: number;
    movement: number;
    radius: number;
    createTime: number;
  }>;
  type State = Readonly<{
    time: number;
    ship: Body;
    bullets: ReadonlyArray<Body>;
    exit: ReadonlyArray<Body>;
    objCount: number;
  }>;

  function createBullet(s: State): Body {
    const d = [s.ship.movement, s.ship.y];
    return {
      id: `bullet${s.objCount}`,
      x: s.ship.x * s.ship.radius,
      y: s.ship.y * s.ship.radius,
      createTime: s.time,
      movement: 0,
      radius: 3,
    };
  }
  function createShip(): Body {
    return {
      id: "ship",
      x: 273,
      y: 520,
      movement: 0,
      radius: 20,
      createTime: 0,
    };
  }
  const initialState: State = {
    time: 0,
    ship: createShip(),
    bullets: [],
    exit: [],
    objCount: 0,
  };

  const moveObj = (o: Body) =>
    <Body>{
      ...o,
      x: o.x + o.x * -1,
      y: o.y + o.y * -1,
    };

    const tick = (s:State,elapsed:number) => {
      const not = <T>(f:(x:T)=>boolean)=>(x:T)=>!f(x),
        expired = (b:Body)=>(elapsed - b.createTime) > 100,
        expiredBullets:Body[] = s.bullets.filter(expired),
        activeBullets = s.bullets.filter(not(expired));
      return <State>{...s, 
        ship:moveObj(s.ship), 
        bullets:activeBullets.map(moveObj), 
        exit:expiredBullets,
        time:elapsed
      }
    }

    const reduceState = (s:State, e:Move|Tick|Shoot)=>
    e instanceof Move ? {...s,
      ship: {...s.ship,torque:e.direction}
    }:
    e instanceof Shoot ? {...s,
      bullets: s.bullets.concat([createBullet(s)]),
      objCount: s.objCount + 1
    } : 
    tick(s,e.elapsed);

  const observeKey = <T>(eventName: string, k: Key, result: () => T) =>
    fromEvent<KeyboardEvent>(document, eventName).pipe(
      filter(({ code }) => code === k),
      filter(({ repeat }) => !repeat),
      map(result)
    );

  const startLeftMove = observeKey("keydown", "ArrowLeft", () => new Move(-2)),
    startRightMove = observeKey("keydown", "ArrowRight", () => new Move(2)),
    stopLeftMove = observeKey("keyup", "ArrowLeft", () => new Move(0)),
    stopRightMove = observeKey("keyup", "ArrowRight", () => new Move(0)),
    shoot = observeKey("keydown", "Space", () => new Shoot());

  function updateView(s: State) {
    const ship = document.getElementById("ship")!,
      show = (id: string, condition: boolean) => (e: HTMLElement) =>
        document.getElementById(id)!;
    ship.setAttribute("transform", `translate(${s.ship.x},${s.ship.y})`);
    const svg = document.getElementById("svgCanvas")!;
    s.bullets.forEach(b=>{
      const createBulletView = ()=>{
        const v = document.createElementNS(svg.namespaceURI, "ellipse")!;
        v.setAttribute("id",b.id);
        v.classList.add("bullet")
        svg.appendChild(v)
        return v;
      }
      const v = document.getElementById(b.id) || createBulletView();
      v.setAttribute("cx",String(b.x))
      v.setAttribute("cy",String(b.y))
      v.setAttribute("rx", String(b.radius));
      v.setAttribute("ry", String(b.radius));
    })
    s.exit.forEach(o=>{
      const v = document.getElementById(o.id);
      if(v) svg.removeChild(v)
    })
  }


  interval(10)
    .pipe(
      map((elapsed) => new Tick(elapsed)),
      merge(startLeftMove, startRightMove, stopLeftMove, stopRightMove),
      merge(shoot),
      scan(reduceState, initialState)
    )
    .subscribe(updateView);
}

// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != "undefined")
  window.onload = () => {
    spaceinvaders();
  };
