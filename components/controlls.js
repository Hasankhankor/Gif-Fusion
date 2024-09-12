import { useEffect, useState } from "react";
import styled from "styled-components";
import Container from "./container";
import AnimatedButton from "./animatedButton";
import time from "../lib/time";
import { fetchFile, createFFmpeg } from "@ffmpeg/ffmpeg";

// Initialize ffmpeg
const ffmpeg = createFFmpeg({ log: true });

const ControllsContainer = styled(Container)`
  justify-content: space-evenly;
  margin-top: 20px;
`;

const OptionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: bold;
  color: ${({ theme }) => theme.headingColor};
  margin-bottom: 20px;

  & span {
    margin: 5px;
  }

  & .error {
    color: red;
    font-size: 0.9em;
  }
`;

const TimeInput = styled.input`
  width: 80px;
  text-align: center;
  margin: 0 5px;
`;

const PredefinedOption = styled.button`
  background-color: ${({ selected }) => (selected ? '#007bff' : '#e9ecef')};
  color: ${({ selected }) => (selected ? '#fff' : '#000')};
  border: none;
  padding: 10px;
  margin: 5px;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background-color: #0056b3;
    color: #fff;
  }
`;

const TimeInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: bold;
  color: ${({ theme }) => theme.headingColor};
`;

export default function Controlls({ video, videoRef, setGif }) {
  const [isConverting, setIsConverting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [startTime, setStartTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [endTime, setEndTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [videoDuration, setVideoDuration] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [selectedOption, setSelectedOption] = useState("custom");

  const predefinedOptions = [
    { label: "10s", duration: 10 },
    { label: "30s", duration: 30 },
    { label: "1m", duration: 60 },
  ];

  const handleTimeChange = (type, value, unit) => {
    const parsedValue = parseInt(value, 10);
    if (unit === 'start') {
      setStartTime({ ...startTime, [type]: parsedValue });
    } else {
      setEndTime({ ...endTime, [type]: parsedValue });
    }
  };

  const handleOptionChange = (option) => {
    setSelectedOption(option.label);
    if (option.label === "custom") {
      setStartTime({ hours: 0, minutes: 0, seconds: 0 });
      setEndTime({ hours: videoDuration.hours, minutes: videoDuration.minutes, seconds: videoDuration.seconds });
    } else {
      const durationInSeconds = option.duration;
      setStartTime({ hours: 0, minutes: 0, seconds: 0 });
      setEndTime({ hours: 0, minutes: 0, seconds: durationInSeconds });
    }
  };

  const convert = async (e) => {
    e.preventDefault();
    if (!ready) {
      setError("FFmpeg is not ready.");
      return;
    }

    setIsConverting(true);

    const startSecondsTotal = startTime.hours * 3600 + startTime.minutes * 60 + startTime.seconds;
    const endSecondsTotal = endTime.hours * 3600 + endTime.minutes * 60 + endTime.seconds;

    if (startSecondsTotal >= endSecondsTotal) {
      setError("End time must be greater than start time.");
      setIsConverting(false);
      return;
    }

    setError("");

    ffmpeg.FS("writeFile", "test.mp4", await fetchFile(video));

    await ffmpeg.run(
      "-i",
      "test.mp4",
      "-t",
      `${endSecondsTotal - startSecondsTotal}`,
      "-ss",
      `${startSecondsTotal}`,
      "-f",
      "gif",
      "out.gif"
    );

    const data = ffmpeg.FS("readFile", "out.gif");
    const url = URL.createObjectURL(new Blob([data.buffer], { type: "image/gif" }));
    setGif(url);
    setIsConverting(false);
  };

  useEffect(() => {
    const initializeFFmpeg = async () => {
      await ffmpeg.load();
      setReady(true);
    };

    initializeFFmpeg();
  }, []);

  useEffect(() => {
    if (video) {
      const setTime = () => {
        const duration = videoRef.current.duration;
        if (duration) {
          const durationString = time.toHHMMSS(duration);

          // Ensure durationString is a string and is correctly formatted
          if (typeof durationString === 'string') {
            const [hours, minutes, seconds] = durationString.split(':').map(Number);
            setVideoDuration({ hours, minutes, seconds });
            setStartTime({ hours: 0, minutes: 0, seconds: 0 });
            setEndTime({ hours, minutes, seconds });
          } else {
            console.error("Invalid duration format:", durationString);
          }
        } else {
          setTimeout(setTime, 100);
        }
      };

      setTimeout(setTime, 100);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [video]);

  return (
    <ControllsContainer as="form" onSubmit={convert} visible={visible}>
      <OptionContainer>
        <span>Select Cut Option:</span>
        {predefinedOptions.map(option => (
          <PredefinedOption
            key={option.label}
            selected={selectedOption === option.label}
            onClick={() => handleOptionChange(option)}
          >
            {option.label}
          </PredefinedOption>
        ))}
        <PredefinedOption
          key="custom"
          selected={selectedOption === "custom"}
          onClick={() => handleOptionChange({ label: "custom" })}
        >
          Custom
        </PredefinedOption>
      </OptionContainer>

      {selectedOption === "custom" && (
        <div>
          <TimeInputContainer>
            <span>Start Time:</span>
            <div>
              <TimeInput
                type="number"
                value={startTime.hours}
                min="0"
                max="23"
                onChange={(e) => handleTimeChange('hours', e.target.value, 'start')}
              />
              <span>:</span>
              <TimeInput
                type="number"
                value={startTime.minutes}
                min="0"
                max="59"
                onChange={(e) => handleTimeChange('minutes', e.target.value, 'start')}
              />
              <span>:</span>
              <TimeInput
                type="number"
                value={startTime.seconds}
                min="0"
                max="59"
                onChange={(e) => handleTimeChange('seconds', e.target.value, 'start')}
              />
            </div>
          </TimeInputContainer>
          <TimeInputContainer>
            <span>End Time:</span>
            <div>
              <TimeInput
                type="number"
                value={endTime.hours}
                min="0"
                max="23"
                onChange={(e) => handleTimeChange('hours', e.target.value, 'end')}
              />
              <span>:</span>
              <TimeInput
                type="number"
                value={endTime.minutes}
                min="0"
                max="59"
                onChange={(e) => handleTimeChange('minutes', e.target.value, 'end')}
              />
              <span>:</span>
              <TimeInput
                type="number"
                value={endTime.seconds}
                min="0"
                max="59"
                onChange={(e) => handleTimeChange('seconds', e.target.value, 'end')}
              />
            </div>
          </TimeInputContainer>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <AnimatedButton
        loading={isConverting || !ready}
        text="Convert"
        loadingText={!ready ? "Loading ffmpeg" : "Converting..."}
      />
    </ControllsContainer>
  );
}
