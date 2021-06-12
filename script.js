'use strict';


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnReset = document.getElementById('btn__reset');

class Workout {
  date = new Date();
  id = (Date.now().toString()).slice(-10);
  // clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]}`;
  }
  // click() {
  //   this.clicks++
  // }
}

class Running extends (Workout) {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    return this.pace = this.duration / this.distance;
  }
}
class Cycling extends (Workout) {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    return this.speed = this.distance / (this.duration / 60);
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 5.2, 24, 523);
// console.log(run1);
// console.log(cycling1);

////////////////////////////////////////////////////////////////////////////////
// Application Architecture
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  html;
  mapMarker;
  mapMarkerArr = [];

  constructor() {
    // Get user's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    // Attach event handler
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    btnReset.addEventListener('click', this.reset);
    containerWorkouts.addEventListener('click', this.removeElem.bind(this));
    containerWorkouts.addEventListener('click', this.changeWorkSet)
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
        alert(`Could not get your position`);
      })
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this))
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    })
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    inputDistance.focus();
    form.classList.remove('hidden');
  }

  _hideForm() {
    inputElevation.value = inputDuration.value = inputDistance.value = inputCadence.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000)
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {

    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    e.preventDefault();


    // if activity running, create running object
    if (type === 'running') {
      // Check if is data valid
      const cadence = +inputCadence.value;
      // !Number.isFinite(distance)
      // || !Number.isFinite(duration)
      // || !Number.isFinite(cadence)
      if (!validInputs(cadence, distance, duration) || !allPositive(cadence, distance, duration))
        return alert('Inputs have to be positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // if activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (!validInputs(elevation, distance, duration) || !allPositive(distance, duration))
        return alert('Inputs have to be positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // render workout on map as a marker
    this._renderWorkoutMarker(workout);

    // render workout on a list
    this._renderWorkout(workout);

    // Hide form and clear inputs
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();

    btnReset.style.display = 'inline-block';
  }

  _renderWorkoutMarker(workout) {
    this.mapMarker = L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    })).setPopupContent(`${workout.type === 'running' ? '🏃‍♂' : '🦶🏼'} ${workout.description}`).openPopup();
    this.mapMarkerArr.push({ id: workout.id, marker: this.mapMarker, })
  }

  _renderWorkout(workout) {
    this.html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <span class="closebtn">&times;</span>
          <h2 class="workout__title">${workout.description}</h2>
          <input type="image" src="settings.png" class="gear">
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂' : '🦶🏼'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running') {
      this.html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
        </li>`
    }
    if (workout.type === 'cycling') {
      this.html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>`
    }
    form.insertAdjacentHTML('afterend', this.html);
    if (this.html)
      btnReset.style.display = 'inline-block';
  }

  _moveToPopup(e) {
    if (e.target.classList.contains('closebtn')) {
      return false;
    }
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      }
    })
    // using public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workout'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    })
  }

  reset() {
    localStorage.removeItem('workout');
    location.reload();
  }

  changeWorkSet(e) {
    if (e.target.classList.contains('gear')) {
      // document.querySelectorAll('.workout__value')?.textContent = 'asd';
      console.log('ANT');
    }
  }

  removeElem(event1) {
    if (event1.target.classList.contains('closebtn')) {
      const workoutEl = event1.target.closest('.workout');
      const workout1 = this.#workouts.find(work => work.id === workoutEl.dataset.id);
      if (workout1)
      workoutEl.remove();
      localStorage.removeItem('workout');
      console.log(this.mapMarker[0]);
      this.#map.removeLayer(this.mapMarkerArr.find(el => el.id === workoutEl.dataset.id).marker);
    }
  }
}
const app = new App();





