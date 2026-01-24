# Yummy ML (LightFM)

## Run training locally

```
export DATABASE_URL=postgresql://yummy:yummy@localhost:5432/yummy
python train.py
```

Optional env:
- `MODEL_VERSION`
- `TOP_N` (default 50)
- `EPOCHS` (default 30)
- `NO_COMPONENTS` (default 32)
