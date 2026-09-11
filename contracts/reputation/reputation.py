# TrustChain: reputation smart contract (PyTeal)
# This contract manages on-chain trust scores for marketplace providers.

# pyrefly: ignore [missing-import]
from pyteal import App, Assert, Btoi, Bytes, Cond, Int, Mode, OnComplete, Return, Seq, Txn, compileTeal

def approval_program():
    # basic logic: only creator can update scores, anyone can read
    on_creation = Seq([
        App.globalPut(Bytes("Creator"), Txn.sender()),
        App.globalPut(Bytes("TotalServices"), Int(0)),
        Return(Int(1))
    ])

    is_creator = Txn.sender() == App.globalGet(Bytes("Creator"))

    update_score = Seq([
        Assert(is_creator),
        App.localPut(Txn.accounts[1], Bytes("TrustScore"), Btoi(Txn.application_args[1])),
        Return(Int(1))
    ])

    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.NoOp, update_score],
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))]
    )
    
    return program

def clear_state_program():
    return Return(Int(1))

if __name__ == "__main__":
    with open("reputation.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=5)
        f.write(compiled)
