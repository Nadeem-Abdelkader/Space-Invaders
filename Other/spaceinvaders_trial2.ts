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
    MovementAcc: 0.1,
    StartTime: 0,
  } as const;

  type ViewType = "ship";

  class Tick {
    constructor(public readonly elapsed: number) {}
  }
  class Move {
    constructor(public readonly direction: number) {}
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
    stopRightMove = keyObservable("keyup", "ArrowRight", () => new Move(0));

  type Body = Readonly<{
    id: string;
    viewType: ViewType;
    pos: Vec;
    vel: Vec;
    acc: Vec;
    angle: number;
    movement: number;
    torque: number;
    radius: number;
    createTime: number;
  }>;

  type State = Readonly<{
    time: number;
    ship: Body;
    exit: ReadonlyArray<Body>;
  }>;

  function createShip(): Body {
    return {
      id: "ship",
      viewType: "ship",
      pos: new Vec(Constants.CanvasSize / 2, Constants.CanvasSize / 2),
      vel: Vec.Zero,
      acc: Vec.Zero,
      angle: 0,
      movement: 0,
      torque: 0,
      radius: 20,
      createTime: 0,
    };
  }

  const initialState: State = {
      time: 0,
      ship: createShip(),
      exit: [],
    },
    // wrap a positions around edges of the screen
    torusWrap = ({ x, y }: Vec) => {
      const s = Constants.CanvasSize,
        wrap = (v: number) => (v < 0 ? v + s : v > s ? v - s : v);
      return new Vec(wrap(x), wrap(y));
    },
    // all movement comes through here
    moveBody = (o: Body) =>
      <Body>{
        ...o,
        movement: o.movement + o.torque,
        angle: o.angle + o.movement,
        pos: torusWrap(o.pos.add(o.vel)),
        vel: o.vel.add(o.acc),
      },
    tick = (s: State, elapsed: number) => {
      const expired = (b: Body) => elapsed - b.createTime > 100;
      return;
    },
    // state transducer
    reduceState = (s: State, e: Move | Tick) =>
      e instanceof Move
        ? { ...s, ship: { ...s.ship, torque: e.direction } }
        : tick(s, e.elapsed);

  const subscription = merge(
    gameClock,
    startLeftMove,
    startRightMove,
    stopLeftMove,
    stopRightMove
  )
    .pipe(scan(reduceState, initialState))
    .subscribe(updateView);

    function updateView(s: State) {
      const 
        svg = document.getElementById("svgCanvas")!,
        ship = document.getElementById("ship")!,
        show = (id:string,condition:boolean)=>((e:HTMLElement) => 
          condition ? e.classList.remove('hidden')
                    : e.classList.add('hidden'))(document.getElementById(id)!),
        updateBodyView = (b:Body) => {
          function createBodyView() {
            const v = document.createElementNS(svg.namespaceURI, "ellipse")!;
            attr(v,{id:b.id,rx:b.radius,ry:b.radius});
            v.classList.add(b.viewType)
            svg.appendChild(v)
            return v;
          }
          const v = document.getElementById(b.id) || createBodyView();
          attr(v,{cx:b.pos.x,cy:b.pos.y});
        };
      attr(ship,{transform:`translate(${s.ship.pos.x},${s.ship.pos.y}) rotate(${s.ship.angle})`});
      show("leftThrust",  s.ship.torque<0);
      show("rightThrust", s.ship.torque>0);
      show("thruster",    s.ship.acc.len()>0);
      s.exit.map(o=>document.getElementById(o.id))
            .filter(isNotNullOrUndefined)
            .forEach(v=>{
              try {
                svg.removeChild(v)
              } catch(e) {
                // rarely it can happen that a bullet can be in exit 
                // for both expiring and colliding in the same tick,
                // which will cause this exception
                console.log("Already removed: "+v.id)
              }
            })
    }
  } 

  //window.onload = asteroids;
setTimeout(spaceinvaders,0)

function showKeys() {
  function showKey(k:Key) {
    const arrowKey = document.getElementById(k)!,
      o = (e:Event) => fromEvent<KeyboardEvent>(document,e).pipe(
        filter(({code})=>code === k))
    o('keydown').subscribe(e => arrowKey.classList.add("highlight"))
    o('keyup').subscribe(_=>arrowKey.classList.remove("highlight"))
  }
  showKey('ArrowLeft');
  showKey('ArrowRight');
  showKey('Space');
}

setTimeout(showKeys, 0)

/////////////////////////////////////////////////////////////////////
// Utility functions

/**
 * A simple immutable vector class
 */
class Vec {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}
  add = (b:Vec) => new Vec(this.x + b.x, this.y + b.y)
  sub = (b:Vec) => this.add(b.scale(-1))
  len = ()=> Math.sqrt(this.x*this.x + this.y*this.y)
  scale = (s:number) => new Vec(this.x*s,this.y*s)
  ortho = ()=> new Vec(this.y,-this.x)
  rotate = (deg:number) =>
            (rad =>(
                (cos,sin,{x,y})=>new Vec(x*cos - y*sin, x*sin + y*cos)
              )(Math.cos(rad), Math.sin(rad), this)
            )(Math.PI * deg / 180)

  static unitVecInDirection = (deg: number) => new Vec(0,-1).rotate(deg)
  static Zero = new Vec();
}

/**
 * apply f to every element of a and return the result in a flat array
 * @param a an array
 * @param f a function that produces an array
 */
function flatMap<T,U>(
  a:ReadonlyArray<T>,
  f:(a:T)=>ReadonlyArray<U>
): ReadonlyArray<U> {
  return Array.prototype.concat(...a.map(f));
}

const 
/**
 * Composable not: invert boolean result of given function
 * @param f a function returning boolean
 * @param x the value that will be tested with f
 */
  not = <T>(f:(x:T)=>boolean)=> (x:T)=> !f(x),
/**
 * is e an element of a using the eq function to test equality?
 * @param eq equality test function for two Ts
 * @param a an array that will be searched
 * @param e an element to search a for
 */
  elem = 
    <T>(eq: (_:T)=>(_:T)=>boolean)=> 
      (a:ReadonlyArray<T>)=> 
        (e:T)=> a.findIndex(eq(e)) >= 0,
/**
 * array a except anything in b
 * @param eq equality test function for two Ts
 * @param a array to be filtered
 * @param b array of elements to be filtered out of a
 */ 
  except = 
    <T>(eq: (_:T)=>(_:T)=>boolean)=>
      (a:ReadonlyArray<T>)=> 
        (b:ReadonlyArray<T>)=> a.filter(not(elem(eq)(b))),
/**
 * set a number of attributes on an Element at once
 * @param e the Element
 * @param o a property bag
 */         
  attr = (e:Element,o:Object) =>
    { for(const k in o) e.setAttribute(k,String(o[k])) }
/**
 * Type guard for use in filters
 * @param input something that might be null or undefined
 */
function isNotNullOrUndefined<T extends Object>(input: null | undefined | T): input is T {
  return input != null;
}
 

// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != "undefined")
  window.onload = () => {
    spaceinvaders();
  };
