import {
  CMessenger,
  CObject,
  CPrimitive,
  InitToken,
  CRegister,
  DefaultSerializer,
  LwwMutCRegister,
  Pre,
  SemidirectProductStore,
  MessageMeta,
  CRDTMessageMeta,
  Serializer,
  RunLocallyLayer,
  PublicCObject,
} from "@collabs/collabs";

// TODO: deal with floating point non-commutativity
class MultNumber extends CPrimitive {
  private _value: number;
  private readonly numberSerializer: Serializer<number>;

  constructor(initToken: InitToken, initialValue: number) {
    super(initToken);
    this.numberSerializer = DefaultSerializer.getInstance<number>(this.runtime);
    this._value = initialValue;
  }

  mult(toMult: number) {
    if (toMult !== 1) {
      super.sendPrimitive(this.numberSerializer.serialize(toMult));
    }
  }

  get value(): number {
    return this._value;
  }

  protected receivePrimitive(message: Uint8Array | string, meta: MessageMeta) {
    let decoded = this.numberSerializer.deserialize(<Uint8Array>message);
    this._value *= decoded;
    this.emit("Any", { meta });
  }

  canGC(): boolean {
    return false;
  }

  save(): Uint8Array {
    return this.numberSerializer.serialize(this._value);
  }

  load(saveData: Uint8Array | null) {
    if (saveData === null) return;
    this._value = this.numberSerializer.deserialize(saveData);
  }
}

export class MultableCRegister extends CObject implements CRegister<number> {
  private readonly runLocallyLayer: RunLocallyLayer;
  // TODO: set an initial value in mutRegister instead.
  private readonly initialMultNumber: MultNumber;
  private readonly mutRegister: LwwMutCRegister<MultNumber, [number]>;
  private readonly semidirectStore: SemidirectProductStore<number, number>;
  private readonly multMessenger: CMessenger<number>;

  constructor(initToken: InitToken, initialValue: number) {
    super(initToken);

    this.runLocallyLayer = this.addChild("", Pre(RunLocallyLayer)());
    const internalCObject = this.runLocallyLayer.setChild(Pre(PublicCObject)());

    this.initialMultNumber = internalCObject.addChild(
      "initial",
      Pre(MultNumber)(initialValue)
    );
    this.mutRegister = internalCObject.addChild(
      "",
      Pre(LwwMutCRegister)((valueInitToken, initialValue) => {
        const multNumber = new MultNumber(valueInitToken, initialValue);
        multNumber.on("Any", (e) => this.emit("Any", e));
        return multNumber;
      })
    );
    this.semidirectStore = this.addChild(
      "0",
      Pre(SemidirectProductStore)(this.action.bind(this))
    );
    this.multMessenger = this.addChild("1", Pre(CMessenger)());

    // Semidirect events.
    this.mutRegister.on("Set", (e) => {
      // Act on the newly set value.
      const multNumber = this.mutRegister.value.get();
      const factor = this.semidirectStore.processM1(
        1,
        CRDTMessageMeta.from(e.meta)
      )!;
      this.runLocallyLayer.runLocally(e.meta, () => multNumber.mult(factor));
    });
    this.multMessenger.on("Message", (e) => {
      // Store the message.
      this.semidirectStore.processM2(e.message, CRDTMessageMeta.from(e.meta));
      // Act on all current values.
      this.runLocallyLayer.runLocally(e.meta, () => {
        this.initialMultNumber.mult(e.message);
        this.mutRegister
          .conflicts()
          .forEach((multNumber) => multNumber.mult(e.message));
      });
    });

    // Emit events.
    this.initialMultNumber.on("Any", (e) => this.emit("Any", e));
    this.mutRegister.on("Any", (e) => this.emit("Any", e));
  }

  private action(m2: number, m1: number): number {
    return m2 * m1;
  }

  mult(toMult: number) {
    if (toMult !== 1) {
      this.multMessenger.sendMessage(toMult);
    }
  }

  set(value: number): number {
    this.mutRegister.set(value);
    return this.value;
  }

  set value(value: number) {
    this.set(value);
  }

  get value(): number {
    const multNumber = this.mutRegister.value;
    return multNumber.isPresent
      ? multNumber.get().value
      : this.initialMultNumber.value;
  }
}
