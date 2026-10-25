/* Click-to-play YouTube: shows the thumbnail, loads the real player only when tapped. */
(function () {
  document.querySelectorAll('.yt-lite[data-id]').forEach(function (box) {
    var id = box.getAttribute('data-id');
    var title = box.getAttribute('data-title') || 'YouTube video';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'yt-lite-btn';
    btn.setAttribute('aria-label', 'Play video: ' + title);
    btn.innerHTML =
      '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy" width="480" height="360" />' +
      '<span class="yt-lite-play" aria-hidden="true"></span>';
    btn.addEventListener('click', function () {
      if (window.ttgoTrack) window.ttgoTrack('video_play', { video_id: id, video_title: title.slice(0, 100), page: location.pathname });
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      frame.title = title;
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      box.replaceChild(frame, btn);
    });
    box.appendChild(btn);
  });
})();
