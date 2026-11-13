//! Item class is a function of the token id. Transfers cannot change it.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ItemClass {
    PlayOnly = 0,
    NearBacked = 1,
    NonTradeable = 2,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Currency {
    PlayGold,
    Near,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ClassError(pub &'static str);

pub fn class_of(token_id: &str) -> Result<ItemClass, ClassError> {
    if token_id == "play:resource:cinder" || token_id.starts_with("rumour:") {
        return Ok(ItemClass::NonTradeable);
    }
    if token_id.starts_with("play:") {
        return Ok(ItemClass::PlayOnly);
    }
    if token_id.starts_with("nb:") {
        return Ok(ItemClass::NearBacked);
    }
    Err(ClassError("token id has no play: or nb: provenance"))
}

pub fn can_trade(class: ItemClass, currency: Currency) -> bool {
    match (class, currency) {
        (ItemClass::NonTradeable, _) => false,
        (ItemClass::PlayOnly, Currency::Near) => false,
        (ItemClass::PlayOnly, Currency::PlayGold) => true,
        (ItemClass::NearBacked, _) => true,
    }
}

pub fn lowest_class(inputs: &[ItemClass]) -> Result<ItemClass, ClassError> {
    inputs.iter().copied().min_by_key(|class| *class as u8).ok_or(ClassError("craft needs an input"))
}

pub fn output_allowed(inputs: &[ItemClass], output: ItemClass) -> bool {
    let Some(lowest) = inputs.iter().copied().min_by_key(|class| *class as u8) else {
        return false;
    };
    if inputs.contains(&ItemClass::NonTradeable) || output == ItemClass::NonTradeable {
        return false;
    }
    output == lowest
}

pub fn allowlisted(token_id: &str, currency: Currency) -> bool {
    if class_of(token_id).ok() == Some(ItemClass::NonTradeable) {
        return false;
    }
    match currency {
        Currency::Near => {
            token_id.starts_with("nb:gear:")
                || token_id.starts_with("nb:blueprint:")
                || token_id.starts_with("nb:resource:")
        }
        Currency::PlayGold => {
            token_id.starts_with("play:gear:")
                || token_id.starts_with("play:resource:")
                || token_id.starts_with("play:trap:")
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Recipe {
    pub output: &'static str,
    pub inputs: &'static [(&'static str, u128)],
}

const RECIPES: &[Recipe] = &[
    Recipe { output: "play:trap:spike", inputs: &[("play:resource:iron", 10), ("play:resource:bone", 5)] },
    Recipe { output: "play:trap:pit", inputs: &[("play:resource:iron", 20), ("play:resource:ash", 10)] },
    Recipe { output: "play:trap:boulder", inputs: &[("play:resource:iron", 30), ("play:resource:bone", 20)] },
    Recipe { output: "play:gear:potion", inputs: &[("play:resource:ash", 5), ("play:resource:bone", 5)] },
    Recipe { output: "play:gear:armor", inputs: &[("play:resource:iron", 20)] },
    Recipe { output: "play:gear:boots", inputs: &[("play:resource:iron", 10), ("play:resource:ash", 10)] },
];

pub fn recipe(output: &str) -> Option<&'static Recipe> {
    RECIPES.iter().find(|recipe| recipe.output == output)
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CraftError {
    UnknownRecipe,
    InputMismatch,
    Provenance,
}

pub fn check_craft(output: &str, inputs: &[(&str, u128)]) -> Result<ItemClass, CraftError> {
    let recipe = recipe(output).ok_or(CraftError::UnknownRecipe)?;
    if recipe.inputs.len() != inputs.len() {
        return Err(CraftError::InputMismatch);
    }
    for (expected, given) in recipe.inputs.iter().zip(inputs.iter()) {
        if expected.0 != given.0 || expected.1 != given.1 {
            return Err(CraftError::InputMismatch);
        }
    }
    let classes: Vec<ItemClass> = inputs
        .iter()
        .map(|(token, _)| class_of(token).map_err(|_| CraftError::Provenance))
        .collect::<Result<_, _>>()?;
    let output_class = class_of(output).map_err(|_| CraftError::Provenance)?;
    if !output_allowed(&classes, output_class) {
        return Err(CraftError::Provenance);
    }
    if classes.iter().any(|class| *class == ItemClass::PlayOnly) && output_class == ItemClass::NearBacked {
        return Err(CraftError::Provenance);
    }
    Ok(output_class)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn play_only_cannot_be_sold_for_near() {
        assert!(!can_trade(ItemClass::PlayOnly, Currency::Near));
        assert!(!allowlisted("play:resource:iron", Currency::Near));
        assert!(allowlisted("play:resource:iron", Currency::PlayGold));
        assert!(allowlisted("nb:gear:potion", Currency::Near));
        assert!(!allowlisted("play:resource:cinder", Currency::PlayGold));
        assert!(!allowlisted("rumour:ashgate:1:page", Currency::Near));
    }

    #[test]
    fn class_is_the_token_id() {
        assert_eq!(class_of("play:resource:iron").unwrap(), ItemClass::PlayOnly);
        assert_eq!(class_of("nb:gear:armor").unwrap(), ItemClass::NearBacked);
        assert_eq!(class_of("play:resource:iron").unwrap(), class_of("play:resource:iron").unwrap());
    }

    #[test]
    fn play_input_cannot_produce_near_backed_output() {
        assert!(!output_allowed(&[ItemClass::PlayOnly, ItemClass::NearBacked], ItemClass::NearBacked));
        assert!(output_allowed(&[ItemClass::PlayOnly], ItemClass::PlayOnly));
        let err = check_craft("nb:gear:potion", &[("play:resource:ash", 5)]).unwrap_err();
        assert_eq!(err, CraftError::UnknownRecipe);
        assert_eq!(
            check_craft("play:trap:spike", &[("play:resource:iron", 10), ("play:resource:bone", 5)]).unwrap(),
            ItemClass::PlayOnly
        );
    }
}
