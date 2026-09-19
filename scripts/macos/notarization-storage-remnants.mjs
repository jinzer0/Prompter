const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
const generatedStorageRemnantFileName = new RegExp(
  `^(?:\\.(?:notarization-resume|notarization-final)\\.json\\.${uuid}\\.tmp|\\.notary-${uuid}\\.json\\.${uuid}\\.tmp|\\.\\.notarization-submit\\.(?:claim|reclaim)\\.${uuid}\\.tmp|\\.notarization-submit\\.(?:claim|reclaim)\\.${uuid}\\.remove)$`,
  "u",
)

export function isGeneratedNotarizationStorageRemnant(fileName) {
  return generatedStorageRemnantFileName.test(fileName)
}
