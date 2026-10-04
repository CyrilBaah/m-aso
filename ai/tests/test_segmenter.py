import numpy as np

from maso_ai.transcription import SAMPLE_RATE, Segmenter


def pcm(seconds: float, loud: bool) -> bytes:
    t = np.arange(int(seconds * SAMPLE_RATE)) / SAMPLE_RATE
    wave = 0.3 * np.sin(2 * np.pi * 220 * t) if loud else 0.001 * np.random.default_rng(0).standard_normal(len(t))
    return (wave * 32767).astype(np.int16).tobytes()


def test_silence_produces_nothing():
    seg = Segmenter()
    assert seg.feed(pcm(3, loud=False)) == []
    assert seg.flush() is None


def test_pause_ends_an_utterance():
    seg = Segmenter()
    jobs = seg.feed(pcm(0.5, loud=False) + pcm(1.5, loud=True) + pcm(1.0, loud=False))
    finals = [j for j in jobs if j.final]
    assert len(finals) == 1
    assert 1.5 <= len(finals[0].audio) / SAMPLE_RATE <= 2.7  # pre-roll, speech and the trailing pause


def test_long_speech_is_cut_and_interims_arrive_while_talking():
    seg = Segmenter(max_utterance=5)
    jobs = seg.feed(pcm(11, loud=True))
    assert sum(j.final for j in jobs) == 2
    assert any(not j.final for j in jobs)


def test_interims_can_be_switched_off():
    jobs = Segmenter().feed(pcm(4, loud=True), want_interim=False)
    assert all(j.final for j in jobs)


def test_a_click_is_ignored():
    seg = Segmenter()
    assert seg.feed(pcm(0.1, loud=True) + pcm(1, loud=False)) == []


def test_frames_split_across_messages_are_joined():
    seg = Segmenter()
    data = pcm(1.2, loud=True) + pcm(1, loud=False)
    jobs = []
    for i in range(0, len(data), 1001):  # odd-sized chunks, as a browser might send
        jobs += seg.feed(data[i : i + 1001], want_interim=False)
    assert len(jobs) == 1 and jobs[0].final
