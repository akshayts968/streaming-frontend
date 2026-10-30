'use client';

import React, { useState, useEffect } from 'react';

/**
 * Parses time strings from WebVTT (HH:MM:SS.mmm or MM:SS.mmm) into seconds
 */
function parseVttTimestamp(timeStr) {
  const parts = timeStr.trim().split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return 0;
}

/**
 * VideoSeekPreview Component
 * Fetches and parses storyboard.vtt for video hover thumbnail sprite previews
 */
export default function VideoSeekPreview({
  videoId,
  hoverTime = 0,
  hoverX = 0,
  containerWidth = 0,
  formatTime,
  backendUrl = 'http://localhost:5001'
}) {
  const [cues, setCues] = useState([]);
  const [activeCue, setActiveCue] = useState(null);

  // Fetch and parse storyboard.vtt when videoId changes
  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;
    const vttUrl = `${backendUrl}/api/videos/storyboard/${videoId}/storyboard.vtt`;

    fetch(vttUrl)
      .then((res) => {
        if (!res.ok) throw new Error('No storyboard vtt');
        return res.text();
      })
      .then((vttText) => {
        if (!isMounted) return;

        // Parse VTT cues
        const parsedCues = [];
        const lines = vttText.split(/\r?\n/);
        let i = 0;

        while (i < lines.length) {
          const line = lines[i].trim();
          if (line.includes('-->')) {
            const timeParts = line.split('-->');
            const startTime = parseVttTimestamp(timeParts[0]);
            const endTime = parseVttTimestamp(timeParts[1]);

            // Next non-empty line has the sprite image url and coordinates
            let cuePayload = '';
            i++;
            while (i < lines.length && !lines[i].trim()) {
              i++;
            }
            if (i < lines.length) {
              cuePayload = lines[i].trim();
            }

            // e.g. sprite_001.jpg#xywh=160,90,160,90
            const match = cuePayload.match(/^([^#]+)#xywh=(\d+),(\d+),(\d+),(\d+)$/);
            if (match) {
              const [, spriteFile, x, y, w, h] = match;
              parsedCues.push({
                start: startTime,
                end: endTime,
                spriteUrl: `${backendUrl}/api/videos/storyboard/${videoId}/${spriteFile}`,
                x: parseInt(x, 10),
                y: parseInt(y, 10),
                w: parseInt(w, 10),
                h: parseInt(h, 10),
              });
            }
          }
          i++;
        }

        setCues(parsedCues);
      })
      .catch(() => {
        if (isMounted) setCues([]);
      });

    return () => {
      isMounted = false;
    };
  }, [videoId, backendUrl]);

  // Find active cue matching hoverTime
  useEffect(() => {
    if (!cues || cues.length === 0) {
      setActiveCue(null);
      return;
    }

    // Storyboards have 100 tiles spanning 500s. Wrap modulo so full-length movies (e.g. 2 hours) show preview frames continuously
    const maxStoryTime = cues[cues.length - 1].end || 500;
    const loopedTime = maxStoryTime > 0 ? (hoverTime % maxStoryTime) : hoverTime;

    const matched = cues.find((c) => loopedTime >= c.start && loopedTime < c.end);
    if (matched) {
      setActiveCue(matched);
    } else {
      setActiveCue(cues[0]);
    }
  }, [hoverTime, cues]);

  // Calculate clamped preview tooltip horizontal offset
  const previewWidth = 160;
  const halfWidth = previewWidth / 2;
  let clampedX = hoverX;
  if (containerWidth > 0) {
    clampedX = Math.max(halfWidth + 8, Math.min(hoverX, containerWidth - halfWidth - 8));
  }

  return (
    <div
      className="video-seek-preview-wrapper"
      style={{
        left: `${clampedX}px`,
      }}
    >
      {activeCue ? (
        <div
          className="seek-thumbnail-frame"
          style={{
            width: `${activeCue.w || 160}px`,
            height: `${activeCue.h || 90}px`,
            backgroundImage: `url(${activeCue.spriteUrl})`,
            backgroundPosition: `-${activeCue.x}px -${activeCue.y}px`,
            backgroundSize: '1600px 900px',
            backgroundRepeat: 'no-repeat',
          }}
        />
      ) : (
        <div className="seek-thumbnail-placeholder">
          <span>{formatTime ? formatTime(hoverTime) : '00:00'}</span>
        </div>
      )}

      {/* Timestamp below frame */}
      <div className="seek-time-badge">
        {formatTime ? formatTime(hoverTime) : '00:00'}
      </div>
    </div>
  );
}
