import { fromEvent, interval, merge } from "rxjs";
import {
  map,
  filter,
  scan,
  mergeMap,
  takeUntil,
  flatMap,
} from "rxjs/operators";

function spaceinvaders() {
  // Inside this function you will use the classes and functions
  // from rx.js
  // to add visuals to the svg element in pong.html, animate them, and make them interactive.
  // Study and complete the tasks in observable exampels first to get ideas.
  // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
  // You will be marked on your functional programming style
  // as well as the functionality that you implement.
  // Document your code!

  type State = Readonly<{
    x: number;
    y: number;
  }>;
  const initialState: State = {
    x: 240,
    y: 490,
  };
  function move(s: State, angleDelta: number): State {
    return {
      x: s.x + angleDelta,
      y: s.y,
    };
  }
  function updateView(state: State): void {
    const ship = document.getElementById("ship")!;
    ship.setAttribute("transform", `translate(${state.x},${state.y})`);
  }
  fromEvent<KeyboardEvent>(document, "keydown")
    .pipe(
      filter(({ code }) => code === "ArrowLeft" || code === "ArrowRight"),
      filter(({ repeat }) => !repeat),
      flatMap((d) =>
        interval(10).pipe(
          takeUntil(
            fromEvent<KeyboardEvent>(document, "keyup").pipe(
              filter(({ code }) => code === d.code)
            )
          ),
          map((_) => d)
        )
      ),
      map(({ code }) => (code === "ArrowLeft" ? -3 : 3)),
      scan(move, initialState)
    )
    .subscribe(updateView);
}

// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != "undefined")
  window.onload = () => {
    spaceinvaders();
  };
