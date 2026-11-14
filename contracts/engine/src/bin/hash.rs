use std::io::{self, Read};
use underrealm_engine::fnv_hex;

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).expect("stdin");
    println!("{}", fnv_hex(input.trim_end_matches(['\n', '\r']).as_bytes()));
}