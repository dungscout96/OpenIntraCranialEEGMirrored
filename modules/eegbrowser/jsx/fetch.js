export const fetch = (...args) => {
  let fourohfoured = false;
  let twoohfoured = false;
  return window.fetch(...args).then(res => {
    switch(res.status) {
      case 401:
        window.location.assign(window.loris.BaseURL);
        return;
      case 404:
        if (fourohfoured) {
          return;
        }
        alert('The hosted EDF files data could not be found.')
        fourohfoured = true;
        return;
      case 204:
        if (twoohfoured) {
          return;
        }
        alert('The client is sending incorectly formatted file requests.')
        twoohfoured = true;
        return
      default:
        return res;
    }
  });
}
