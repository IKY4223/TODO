from app.showcase.cache import TtlCache


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def test_entry_is_served_until_its_lifetime_ends() -> None:
    clock = Clock()
    cache = TtlCache[str](max_entries=10, clock=clock)
    cache.put("uid", "showcase", ttl=60)

    clock.now = 59
    assert cache.get("uid") == "showcase"
    clock.now = 60
    assert cache.get("uid") is None


def test_missing_entry() -> None:
    assert TtlCache[str](max_entries=10).get("uid") is None


def test_oldest_entry_makes_room_when_full() -> None:
    cache = TtlCache[str](max_entries=2)
    for key in ("first", "second", "third"):
        cache.put(key, key, ttl=60)
    assert [cache.get(key) for key in ("first", "second", "third")] == [None, "second", "third"]


def test_clear_drops_everything() -> None:
    cache = TtlCache[str](max_entries=10)
    cache.put("uid", "showcase", ttl=60)
    cache.clear()
    assert cache.get("uid") is None
